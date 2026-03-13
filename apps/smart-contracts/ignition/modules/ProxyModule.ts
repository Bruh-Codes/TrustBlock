import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const proxyModule = buildModule("ProxyModule", (m)=> {
    const proxyAdminOwner = m.getAccount(0);
    const Escrow = m.contract("Escrow");

    const proxy = m.contract("TransparentUpgradeableProxy",[
        Escrow,
        proxyAdminOwner,
        '0x'
    ])

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");

    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    return {
        proxyAdmin,
        proxy
    }

})

export default proxyModule;