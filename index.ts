import { Connection, Keypair, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { OnlinePumpSdk } from "@pump-fun/pump-sdk";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import BN from "bn.js";

dotenv.config();

async function forgeSelf() {
    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", "finalized");
    const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_PRIVATE_KEY!));
    const sdk = new OnlinePumpSdk(connection);
    const mint = Keypair.generate();

    console.log(`\n[FORGE] Initiating *SELF: ${mint.publicKey.toBase58()}`);

    // 1. Create the Pocket (ATA)
    const ata = getAssociatedTokenAddressSync(mint.publicKey, signer.publicKey);
    const createAtaIx = createAssociatedTokenAccountInstruction(
        signer.publicKey, ata, signer.publicKey, mint.publicKey
    );

    // 2. The 042 Logic (1.5% Supply) - Manual Calculation for Devnet Stability
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = new BN(15000000).mul(new BN(10).pow(new BN(6))); // Target 15M tokens

    // 3. Build Instructions
    const instructions = await sdk.createAndBuyInstructions({
        mint: mint.publicKey,
        creator: signer.publicKey,
        user: signer.publicKey,
        solAmount: solAmount,
        amount: buyAmount,
        slippage: new BN(3000), // 30% slippage for Devnet chaos
        name: "Moment2Moment",
        symbol: "SELF",
        uri: "https://mannareddy.github.io/SELF/Seal.png",
    });

    // 4. Jito Tip (Internal)
    const jitoTipAccount = new PublicKey("HFqU5X6znB4ccSshS2pTfc86fAogZz9i3a53X21FhHxy");
    const tipIx = SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: jitoTipAccount,
        lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    // 5. Build Versioned Transaction (The 2026 Standard)
    const { blockhash } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
        payerKey: signer.publicKey,
        recentBlockhash: blockhash,
        instructions: [createAtaIx, ...instructions, tipIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([signer, mint]);

    console.log(`[STATUS] Pushing Atomic Bundle (1.5% Buy + Jito Tip)...`);

    try {
        const sig = await connection.sendRawTransaction(tx.serialize(), { 
            skipPreflight: true, 
            maxRetries: 5 
        });
        console.log(`\n[SUCCESS] SIGNATURE: ${sig}`);
        console.log(`[VIEW] https://solscan.io/tx/${sig}?cluster=devnet`);
    } catch (e) {
        console.error(`[FAIL] Forge cracked:`, e);
    }
}

forgeSelf().catch(console.error);
