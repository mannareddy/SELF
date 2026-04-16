import { Connection, Keypair, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
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

    // 1. Pre-calculate the "Pocket" (ATA)
    const ata = getAssociatedTokenAddressSync(mint.publicKey, signer.publicKey);
    const createAtaIx = createAssociatedTokenAccountInstruction(
        signer.publicKey, ata, signer.publicKey, mint.publicKey
    );

    // 2. The 042 Logic (1.5% Supply)
    const global = await sdk.fetchGlobal();
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = getBuyTokenAmountFromSolAmount(global, solAmount);

    // 3. Create & Buy Instructions (V2 logic for 2026)
    const instructions = await sdk.createAndBuyInstructions({
        mint: mint.publicKey,
        creator: signer.publicKey,
        user: signer.publicKey,
        solAmount: solAmount,
        amount: buyAmount,
        slippage: new BN(2000), // 20% Slippage - Extreme buffer for Devnet
        name: "Moment2Moment",
        symbol: "SELF",
        uri: "https://mannareddy.github.io/SELF/Seal.png",
    });

    // 4. Build the Versioned Transaction
    const jitoTipAccount = new PublicKey("HFqU5X6znB4ccSshS2pTfc86fAogZz9i3a53X21FhHxy");
    const tipIx = SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: jitoTipAccount,
        lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    const { blockhash } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
        payerKey: signer.publicKey,
        recentBlockhash: blockhash,
        instructions: [createAtaIx, ...instructions, tipIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([signer, mint]);

    console.log(`[STATUS] Sending Versioned Atomic Bundle...`);

    try {
        const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
        console.log(`\n[SUCCESS] *SELF IS FORGED!`);
        console.log(`[SIGNATURE] ${sig}`);
        console.log(`[VIEW] https://solscan.io/token/${mint.publicKey.toBase58()}?cluster=devnet`);
    } catch (e) {
        console.error(`[FAIL] The Forge cracked:`, e);
    }
}

forgeSelf().catch(console.error);
