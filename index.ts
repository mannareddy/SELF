import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
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

    // 1. Setup the "Pocket" (ATA) for your tokens
    const ata = await getAssociatedTokenAddress(mint.publicKey, signer.publicKey);
    const createAtaIx = createAssociatedTokenAccountInstruction(
        signer.publicKey,
        ata,
        signer.publicKey,
        mint.publicKey
    );

    // 2. Calculate the 042 Buy (Targeting ~1.5% Supply)
    const global = await sdk.fetchGlobal();
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = getBuyTokenAmountFromSolAmount(global, solAmount);

    // 3. Build instructions (Setting Slippage to 10% for success)
    const instructions = await sdk.createAndBuyInstructions({
        mint: mint.publicKey,
        creator: signer.publicKey,
        user: signer.publicKey,
        solAmount: solAmount,
        amount: buyAmount,
        slippage: new BN(1000), // 10% slippage buffer
        name: "Moment2Moment",
        symbol: "SELF",
        uri: "https://mannareddy.github.io/SELF/Seal.png",
    });

    // 4. Jito Tip (Internal Instruction)
    const jitoTipAccount = new PublicKey("HFqU5X6znB4ccSshS2pTfc86fAogZz9i3a53X21FhHxy"); 
    const tipIx = SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: jitoTipAccount,
        lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    // 5. Build and Sign the Atomic Transaction
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction().add(createAtaIx, ...instructions, tipIx);
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    tx.sign(signer, mint);

    console.log(`[STATUS] Executing Atomic Forge (Creation + 0.420 SOL Buy)...`);

    try {
        const signature = await connection.sendRawTransaction(tx.serialize());
        console.log(`\n[SUCCESS] *SELF is LIVE!`);
        console.log(`[SIGNATURE] ${signature}`);
        console.log(`[VIEW] https://solscan.io/token/${mint.publicKey.toBase58()}?cluster=devnet`);
    } catch (e) {
        console.error(`\n[ERROR] Forge failed. Likely insufficient SOL or RPC timeout.`);
        console.log(e);
    }
}

forgeSelf().catch(console.error);
