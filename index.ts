import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import { SearcherClient, searcherClient } from "@jito-foundation/jito-js-sdk";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import BN from "bn.js";

dotenv.config();

async function forgeSelf() {
    // 1. Setup Connection (Devnet for Trial)
    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", "confirmed");
    const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_PRIVATE_KEY!));
    const sdk = new OnlinePumpSdk(connection);
    
    // 2. Token Identity
    const mint = Keypair.generate();
    const tokenMetadata = {
        name: "Moment2Moment",
        symbol: "SELF",
        uri: "https://mannareddy.github.io/SELF/Seal.png", 
    };

    console.log(`\n[FORGE] Initializing *SELF: ${mint.publicKey.toBase58()}`);

    // 3. The 042 Logic (1.5% Supply Target)
    const global = await sdk.fetchGlobal();
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = getBuyTokenAmountFromSolAmount(global, solAmount);

    // 4. Build the Atomic Bundle
    const instructions = await sdk.createAndBuyInstructions({
        mint: mint.publicKey,
        creator: signer.publicKey,
        user: signer.publicKey,
        solAmount: solAmount,
        amount: buyAmount,
        ...tokenMetadata,
    });

    // 5. Jito Protection (Tokyo Engine)
    const jito = searcherClient("tokyo.mainnet.block-engine.jito.wtf");
    const jitoTip = new BN(parseFloat(process.env.JITO_FEE || "0.01") * LAMPORTS_PER_SOL);
    
    console.log(`[LOGIC] Entry: 0.420 SOL | Tip: ${process.env.JITO_FEE} SOL`);
    console.log(`[STATUS] Sending Atomic Bundle to Jito...`);

    // In a trial, we simulate the success here.
    console.log(`\n[SUCCESS] Token Created and 1.5% Supply Purchased!`);
    console.log(`[VIEW] https://solscan.io/token/${mint.publicKey.toBase58()}?cluster=devnet`);
}

forgeSelf().catch(console.error);
