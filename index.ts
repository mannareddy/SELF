import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import BN from "bn.js";

dotenv.config();

async function forgeSelf() {
    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", "confirmed");
    const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_PRIVATE_KEY!));
    const sdk = new OnlinePumpSdk(connection);
    const mint = Keypair.generate();

    console.log(`\n[FORGE] Initiating *SELF: ${mint.publicKey.toBase58()}`);

    // 1. Calculate the 042 Buy (1.5% Target)
    const global = await sdk.fetchGlobal();
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = getBuyTokenAmountFromSolAmount(global, solAmount);

    // 2. Build the Combined Instructions
    const instructions = await sdk.createAndBuyInstructions({
        mint: mint.publicKey,
        creator: signer.publicKey,
        user: signer.publicKey,
        solAmount: solAmount,
        amount: buyAmount,
        name: "Moment2Moment",
        symbol: "SELF",
        uri: "https://mannareddy.github.io/SELF/Seal.png",
    });

    // 3. Add Jito Tip INSIDE the same Transaction
    // Use the official 2026 Devnet Tip Account
    const jitoTipAccount = new PublicKey("HFqU5X6znB4ccSshS2pTfc86fAogZz9i3a53X21FhHxy"); 
    const tipIx = SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: jitoTipAccount,
        lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    // 4. Forge the "Atomic" Tx
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction().add(...instructions, tipIx);
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    
    // Sign with both you and the new token mint
    tx.sign(signer, mint);

    console.log(`[STATUS] Pushing Atomic Signature to the chain...`);

    try {
        const signature = await connection.sendRawTransaction(tx.serialize());
        console.log(`\n[SUCCESS] Token Created & 1.5% Purchased!`);
        console.log(`[SIGNATURE] ${signature}`);
        console.log(`[VIEW] https://solscan.io/token/${mint.publicKey.toBase58()}?cluster=devnet`);
    } catch (e) {
        console.error(`\n[ERROR] The Forge failed. Check SOL balance or RPC.`);
    }
}

forgeSelf().catch(console.error);
