import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./ProxyModule";

const EscrowModule = buildModule("EscrowModule", (m) => {
    const { proxy, proxyAdmin } = m.useModule(proxyModule);

    const Escrow = m.contractAt("Escrow", proxy);
    const EscrowReader = m.contract("EscrowReader", [proxy]);

    return { Escrow, EscrowReader, proxyAdmin, proxy };
});

export default EscrowModule;
