import path = require("path");
import fs = require("fs");
import { Account, Argument, BackendSigner, Balance, Code, ContractFunction, GasLimit, NetworkConfig, ProxyProvider, SmartContract } from "@elrondnetwork/erdjs";
import { AbiRegistry, TypeDescriptor, U32Value, Vector } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BinaryCodec } from "@elrondnetwork/erdjs/out/smartcontracts/codec"

async function main() {
    let codec = new BinaryCodec();
    let provider = new ProxyProvider("http://localhost:7950");
    let keyFilePath = path.resolve(__dirname, "../testnet/wallets/users/alice.json");
    let keyFileJson = fs.readFileSync(keyFilePath, { encoding: "utf8" });
    let keyFileObject = JSON.parse(keyFileJson);
    let password = "password";
    let signer = BackendSigner.fromWalletKey(keyFileObject, password);
    let user = new Account(signer.getAddress());

    let abiPath = path.resolve(__dirname, "abi.json");
    let abiJson = fs.readFileSync(abiPath, { encoding: "utf8" });
    let abiObject = JSON.parse(abiJson);
    let abi = new AbiRegistry();
    abi.extend(abiObject);
    let namespace = abi.findNamespace("lottery-egld");

    await NetworkConfig.getDefault().sync(provider);
    await user.sync(provider);

    // Deploy TRANSACTION
    let contractFile = path.resolve(__dirname, "../output/lottery-egld.wasm");
    let contract = new SmartContract({});
    let transactionDeploy = contract.deploy({
        code: Code.fromFile(contractFile),
        gasLimit: new GasLimit(100000000),
        initArguments: []
    });

    // The deploy transaction should be signed, so that the address of the contract
    // (required for the subsequent transactions) is computed.
    transactionDeploy.setNonce(user.nonce);
    await signer.sign(transactionDeploy);
    user.incrementNonce();

    // Start TRANSACTION
    let transactionStart = contract.call({
        func: new ContractFunction("start"),
        gasLimit: new GasLimit(50000000),
        args: [
            Argument.fromUTF8("foobar"),
            Argument.fromBigInt(Balance.eGLD(1).valueOf()),
            Argument.fromProvidedOptional(new U32Value(2)),
            Argument.fromMissingOptional(),
            Argument.fromProvidedOptional(new U32Value(2)),
            Argument.fromMissingOptional(),
            Argument.fromMissingOptional()
        ]
    });

    // Apply nonces and sign the remaining transactions
    transactionStart.setNonce(user.nonce);
    await signer.sign(transactionStart);
    user.incrementNonce();

    let transactionStart1 = contract.call({
        func: new ContractFunction("start"),
        gasLimit: new GasLimit(50000000),
        args: [
            Argument.fromUTF8("testtest"),
            Argument.fromBigInt(Balance.eGLD(1).valueOf()),
            Argument.fromProvidedOptional(new U32Value(2)),
            Argument.fromMissingOptional(),
            Argument.fromProvidedOptional(new U32Value(2)),
            Argument.fromMissingOptional(),
            Argument.fromMissingOptional()
        ]
    });

    // Apply nonces and sign the remaining transactions
    transactionStart1.setNonce(user.nonce);
    await signer.sign(transactionStart1);
    user.incrementNonce();

    let transactionBuy = contract.call({
        func: new ContractFunction("buy_ticket"),
        gasLimit: new GasLimit(50000000),
        value: Balance.eGLD(1),
        args: [
            Argument.fromUTF8("foobar")
        ]
    });
    // Apply nonces and sign the remaining transactions
    transactionBuy.setNonce(user.nonce);
    await signer.sign(transactionBuy);

    user.incrementNonce();

    let transactionBuy1 = contract.call({
        func: new ContractFunction("buy_ticket"),
        gasLimit: new GasLimit(50000000),
        value: Balance.eGLD(1),
        args: [
            Argument.fromUTF8("testtest")
        ]
    });
    // Apply nonces and sign the remaining transactions
    transactionBuy1.setNonce(user.nonce);
    await signer.sign(transactionBuy1);
    user.incrementNonce();

    let transactionBuy2 = contract.call({
        func: new ContractFunction("buy_ticket"),
        gasLimit: new GasLimit(50000000),
        value: Balance.eGLD(1),
        args: [
            Argument.fromUTF8("foobar")
        ]
    });
    // Apply nonces and sign the remaining transactions
    transactionBuy2.setNonce(user.nonce);
    await signer.sign(transactionBuy2);
    user.incrementNonce();

    let getWinner = contract.call({
        func: new ContractFunction("determine_winner"),
        gasLimit: new GasLimit(50000000),
        args: [
            Argument.fromUTF8("foobar")
        ]
    });
    // Apply nonces and sign the remaining transactions
    getWinner.setNonce(user.nonce);
    await signer.sign(getWinner);

    // Broadcast & execute
    await transactionDeploy.send(provider);
    await transactionStart.send(provider);
    await transactionStart1.send(provider);
    await transactionBuy.send(provider);
    await transactionBuy1.send(provider);
    await transactionBuy2.send(provider);
    await getWinner.send(provider);

    await transactionDeploy.awaitExecuted(provider);
    await transactionStart.awaitExecuted(provider);
    await transactionBuy.awaitExecuted(provider);
    await transactionBuy1.awaitExecuted(provider);
    await transactionBuy2.awaitExecuted(provider);
    await getWinner.awaitExecuted(provider);

    // Query state
    // let queryResponse = await contract.runQuery(provider, {
    //     func: new ContractFunction("lotteryExists"),
    //     args: [
    //         Argument.fromUTF8("foobar")
    //     ]
    // });

    // let values = codec.decodeFunctionOutput(queryResponse.buffers(), namespace.findFunction("lotteryExists"));
    // console.log("lotteryExists", values);

    // Query state
    let queryResponse = await contract.runQuery(provider, {
        func: new ContractFunction("holderLoteries"),
        args: [
            Argument.fromPubkey(user.address)
        ]
    });

    let vb = codec.decodeTopLevel<Vector>(queryResponse.buffers()[0], TypeDescriptor.createFromTypeNames(["Vector", "Vector", "U8"]));
    console.log(vb.valueOf());
    vb.valueOf().forEach(lotteryName => {
        let arr = (lotteryName.map((el) => {
            return Number(el.toString());
        }));
        console.log(Buffer.from(arr).toString());
    });


    let queryResponse1 = await contract.runQuery(provider, {
        func: new ContractFunction("allLotteries")
    });

    let vb1 = codec.decodeTopLevel<Vector>(queryResponse1.buffers()[0], TypeDescriptor.createFromTypeNames(["Vector", "Vector", "U8"]));
    console.log(vb1.valueOf());
    vb1.valueOf().forEach(lotteryName => {
        let arr = (lotteryName.map((el) => {
            return Number(el.toString());
        }));
        console.log(Buffer.from(arr).toString());
    });
}
    (async () => {
        await main();
    })();
