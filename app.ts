import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenBasics } from "./target/types/token_basics";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

async function main() {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.TokenBasics as Program<TokenBasics>;
    
    // Setup accounts
    const wallet = provider.wallet as anchor.Wallet;
    const mintKeypair = Keypair.generate();
    
    // Calculate the token account address
    const walletTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
        // 1. Create the token mint
        console.log("Creating token mint...");
        const createTx = await program.methods
            .createToken("My Token", "MT", "https://example.com")
            .accounts({
                authority: wallet.publicKey,
                mint: mintKeypair.publicKey,
                tokenProgram2022: TOKEN_2022_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([mintKeypair])
            .rpc();
        
        console.log("Token created! Signature:", createTx);

        // 2. Mint tokens
        console.log("Minting tokens...");
        const mintAmount = new anchor.BN(1000_000_000); // 1 token with 9 decimals
        const mintTx = await program.methods
            .mintToken(mintAmount)
            .accounts({
                authority: wallet.publicKey,
                mint: mintKeypair.publicKey,
                tokenAccount: walletTokenAccount,
                tokenProgram2022: TOKEN_2022_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log("Tokens minted! Signature:", mintTx);

        // 3. Check balance
        const balance = await provider.connection.getTokenAccountBalance(walletTokenAccount);
        console.log("Token balance:", balance.value.uiAmount);

    } catch (error) {
        console.error("Error:", error);
    }
}

main().then(
    () => process.exit(0),
    (error) => {
        console.error(error);
        process.exit(1);
    }
); 