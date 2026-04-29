use soroban_sdk::{testutils::Address as _, vec, Address, Env, String};
use trustblock_escrow::{EscrowStatus, TrustBlockEscrowContract, TrustBlockEscrowContractClient};

#[test]
fn initialize_sets_state() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TrustBlockEscrowContract);
    let client = TrustBlockEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let escrow_titles = vec![&env, String::from_str(&env, "M1")];
    let escrow_amounts = vec![&env, 100_i128];
    let recipient = Address::generate(&env);

    let escrow_id = client.create_escrow(
        &admin,
        &recipient,
        &None,
        &String::from_str(&env, "Escrow"),
        &escrow_titles,
        &escrow_amounts,
    );

    assert_eq!(escrow_id, 1);
}

#[test]
#[should_panic(expected = "already initialized")]
fn initialize_cannot_run_twice() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TrustBlockEscrowContract);
    let client = TrustBlockEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn escrow_single_milestone_full_lifecycle() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TrustBlockEscrowContract);
    let client = TrustBlockEscrowContractClient::new(&env, &contract_id);

    let payer = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&payer);

    let titles = vec![&env, String::from_str(&env, "Milestone 1")];
    let amounts = vec![&env, 1_000_i128];

    let escrow_id = client.create_escrow(
        &payer,
        &recipient,
        &None,
        &String::from_str(&env, "Escrow A"),
        &titles,
        &amounts,
    );

    client.fund_escrow(&escrow_id, &payer, &1_000);
    client.submit_milestone(&escrow_id, &0, &recipient);
    client.approve_milestone(&escrow_id, &0, &payer);
    client.release_milestone(&escrow_id, &0, &payer);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Completed);
    assert_eq!(escrow.released_amount, 1_000);
}

#[test]
fn refund_unfunded_escrow_sets_cancelled() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TrustBlockEscrowContract);
    let client = TrustBlockEscrowContractClient::new(&env, &contract_id);

    let payer = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&payer);

    let titles = vec![&env, String::from_str(&env, "Only milestone")];
    let amounts = vec![&env, 700_i128];

    let escrow_id = client.create_escrow(
        &payer,
        &recipient,
        &None,
        &String::from_str(&env, "Escrow B"),
        &titles,
        &amounts,
    );

    client.refund_escrow(&escrow_id, &payer);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Cancelled);
    assert_eq!(escrow.refunded_amount, 700);
}
