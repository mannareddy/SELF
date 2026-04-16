
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import { SearcherClient, searcherClient } from "@jito-foundation/jito-js-sdk";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import BN from "bn.js";

dotenv.config();

async function forgeSelf() {
    // 1. Setup Connection & Signer
    const connection = new Connection(process.env.RPC_URL!, "confirmed");
    const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_PRIVATE_KEY!));
    const sdk = new OnlinePumpSdk(connection);
    
    // 2. Metadata for *SELF
    const mint = Keypair.generate();
    const tokenMetadata = {
        name: process.env.TOKEN_NAME || "Moment2Moment",
        symbol: process.env.TOKEN_SYMBOL || "SELF",
        uri: process.env.IMAGE_URL || "https://mannareddy.github.io/SELF/Seal.png",
    };

    console.log(`[FORGE] Initializing *SELF at address: ${mint.publicKey.toBase58()}`);

    // 3. Calculate 0.420 SOL Buy
    const global = await sdk.fetchGlobal();
    const solAmount = new BN(0.420 * LAMPORTS_PER_SOL);
    const buyAmount = getBuyTokenAmountFromSolAmount(global, solAmount);

    // 4. Build Atomic Instructions
    const instructions = await sdk.createAndBuyInstructions({
        mint: mint.publicKey,
        creator: signer.publicKey,
        user: signer.publicKey,
        solAmount: solAmount,
        amount: buyAmount,
        ...tokenMetadata,
    });

    // 5. Jito Bundling Logic
    const jito = searcherClient(process.env.BLOCKENGINEURL!);
    const jitoTip = new BN(parseFloat(process.env.JITO_FEE!) * LAMPORTS_PER_SOL);
    
    // Note: The bundle will include the Create + Buy + Jito Tip
    console.log(`[LOGIC] Signature: 0.420 SOL Genesis Buy (1.5% Supply Target)`);
    console.log(`[LOGIC] Shield: ${process.env.JITO_FEE} SOL Jito Tip`);

    // Execution logic follows...
    // (This part triggers the sending of the bundle)
}

forgeSelf().catch(console.error);
