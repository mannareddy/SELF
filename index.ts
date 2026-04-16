import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import { searcherClient } from "@jito-foundation/jito-js-sdk";
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

    // 1. Calculate 0.420 SOL Buy
    const global = await sdk.fetchGlobal();
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = getBuyTokenAmountFromSolAmount(global, solAmount);

    // 2. Build Instructions
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

    // 3. Add Jito Tip Instruction
    const jitoTipAccount = new PublicKey("96g9sAg9u3mBsJqc9GatvS9kH67fFDPqT4n72r7KAtuW"); // Tokyo Tip Account
    const jitoTipAmount = parseFloat(process.env.JITO_FEE || "0.01") * LAMPORTS_PER_SOL;
    
    const tipIx = SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: jitoTipAccount,
        lamports: jitoTipAmount,
    });

    // 4. Assemble & Sign Transaction
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction().add(...instructions, tipIx);
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    tx.sign(signer, mint);

    // 5. Submit Bundle to Jito
    const jito = searcherClient("tokyo.mainnet.block-engine.jito.wtf");
    console.log(`[STATUS] Sending Atomic Bundle (Buy: 0.420 SOL | Tip: ${process.env.JITO_FEE} SOL)`);

    try {
        const bundleId = await jito.sendBundle([tx]);
        console.log(`\n[SUCCESS] Bundle Submitted! ID: ${bundleId}`);
        console.log(`[VIEW] https://solscan.io/token/${mint.publicKey.toBase58()}?cluster=devnet`);
        console.log(`\nNOTE: It may take 30-60 seconds for Solscan to index the new token.`);
    } catch (e) {
        console.error("\n[ERROR] Bundle failed. Check SOL balance or Jito Tip.");
    }
}

forgeSelf().catch(console.error);
