use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextEscrowId,
    Escrow(u64),
    Milestones(u64),
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    AwaitingFunding = 0,
    Live = 1,
    InReview = 2,
    Disputed = 3,
    Completed = 4,
    Cancelled = 5,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MilestoneStatus {
    Pending = 0,
    InReview = 1,
    Approved = 2,
    Released = 3,
    Disputed = 4,
    Refunded = 5,
    Resolved = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub client: Address,
    pub funded_amount: i128,
    pub id: u64,
    pub recipient: Address,
    pub refunded_amount: i128,
    pub released_amount: i128,
    pub resolver: Option<Address>,
    pub status: EscrowStatus,
    pub title: soroban_sdk::String,
    pub total_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub amount: i128,
    pub client_approved: bool,
    pub id: u32,
    pub released: bool,
    pub submitted: bool,
    pub title: soroban_sdk::String,
}

#[contract]
pub struct TrustBlockEscrowContract;

#[contractimpl]
impl TrustBlockEscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextEscrowId, &1u64);
    }

    pub fn create_escrow(
        env: Env,
        client: Address,
        recipient: Address,
        resolver: Option<Address>,
        title: soroban_sdk::String,
        milestone_titles: Vec<soroban_sdk::String>,
        milestone_amounts: Vec<i128>,
    ) -> u64 {
        if milestone_titles.is_empty() {
            panic!("must have at least one milestone");
        }
        
        if milestone_titles.len() != milestone_amounts.len() {
            panic!("milestone titles and amounts must have same length");
        }

        let total_amount: i128 = milestone_amounts.iter().sum();
        if total_amount <= 0 {
            panic!("total amount must be positive");
        }

        let escrow_id: u64 = env.storage().instance().get(&DataKey::NextEscrowId).unwrap_or(1);
        let next_id = escrow_id.checked_add(1).unwrap();
        env.storage().instance().set(&DataKey::NextEscrowId, &next_id);

        let escrow = Escrow {
            client: client.clone(),
            funded_amount: 0,
            id: escrow_id,
            recipient: recipient.clone(),
            refunded_amount: 0,
            released_amount: 0,
            resolver: resolver.clone(),
            status: EscrowStatus::AwaitingFunding,
            title: title.clone(),
            total_amount,
        };

        env.storage().instance().set(&DataKey::Escrow(escrow_id), &escrow);

        let mut milestones = Vec::new(&env);
        for (i, milestone_title) in milestone_titles.iter().enumerate() {
            let idx = i as u32;
            let milestone = Milestone {
                amount: milestone_amounts.get(idx).unwrap(),
                client_approved: false,
                id: idx,
                released: false,
                submitted: false,
                title: milestone_title.clone(),
            };
            milestones.push_back(milestone);
        }

        env.storage().instance().set(&DataKey::Milestones(escrow_id), &milestones);
        escrow_id
    }

    pub fn fund_escrow(env: Env, escrow_id: u64, client: Address, amount: i128) {
        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("escrow not found"));

        if escrow.client != client {
            panic!("unauthorized");
        }

        if escrow.status != EscrowStatus::AwaitingFunding {
            panic!("escrow not awaiting funding");
        }

        if amount != escrow.total_amount {
            panic!("amount must equal total escrow amount");
        }

        escrow.funded_amount = amount;
        escrow.status = EscrowStatus::Live;
        env.storage().instance().set(&DataKey::Escrow(escrow_id), &escrow);
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        env.storage().instance().get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("escrow not found"))
    }

    pub fn get_milestones(env: Env, escrow_id: u64) -> Vec<Milestone> {
        env.storage().instance().get(&DataKey::Milestones(escrow_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn submit_milestone(env: Env, escrow_id: u64, milestone_id: u32, recipient: Address) {
        let escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("escrow not found"));

        if escrow.recipient != recipient {
            panic!("unauthorized");
        }

        let mut milestones: Vec<Milestone> = env.storage().instance().get(&DataKey::Milestones(escrow_id))
            .unwrap_or_else(|| panic!("milestones not found"));

        if milestone_id >= milestones.len() as u32 {
            panic!("milestone not found");
        }

        let mut milestone = milestones.get(milestone_id).unwrap();

        if milestone.submitted {
            panic!("milestone already submitted");
        }

        milestone.submitted = true;
        milestones.set(milestone_id, milestone);
        env.storage().instance().set(&DataKey::Milestones(escrow_id), &milestones);

        let mut escrow_mut: Escrow = escrow;
        escrow_mut.status = EscrowStatus::InReview;
        env.storage().instance().set(&DataKey::Escrow(escrow_id), &escrow_mut);
    }

    pub fn approve_milestone(env: Env, escrow_id: u64, milestone_id: u32, client: Address) {
        let escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("escrow not found"));

        if escrow.client != client {
            panic!("unauthorized");
        }

        let mut milestones: Vec<Milestone> = env.storage().instance().get(&DataKey::Milestones(escrow_id))
            .unwrap_or_else(|| panic!("milestones not found"));

        if milestone_id >= milestones.len() as u32 {
            panic!("milestone not found");
        }

        let mut milestone = milestones.get(milestone_id).unwrap();

        if !milestone.submitted {
            panic!("milestone not submitted");
        }

        if milestone.client_approved {
            panic!("milestone already approved");
        }

        milestone.client_approved = true;
        milestones.set(milestone_id, milestone);
        env.storage().instance().set(&DataKey::Milestones(escrow_id), &milestones);
    }

    pub fn release_milestone(env: Env, escrow_id: u64, milestone_id: u32, client: Address) {
        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("escrow not found"));

        if escrow.client != client {
            panic!("unauthorized");
        }

        let mut milestones: Vec<Milestone> = env.storage().instance().get(&DataKey::Milestones(escrow_id))
            .unwrap_or_else(|| panic!("milestones not found"));

        if milestone_id >= milestones.len() as u32 {
            panic!("milestone not found");
        }

        let mut milestone = milestones.get(milestone_id).unwrap();

        if !milestone.client_approved {
            panic!("milestone not approved");
        }

        if milestone.released {
            panic!("milestone already released");
        }

        milestone.released = true;
        let released_amount = milestone.amount;
        milestones.set(milestone_id, milestone);
        env.storage().instance().set(&DataKey::Milestones(escrow_id), &milestones);

        escrow.released_amount += released_amount;
        let total_released = milestones.iter()
            .filter(|m| m.released)
            .map(|m| m.amount)
            .sum::<i128>();
            
        if total_released == escrow.total_amount {
            escrow.status = EscrowStatus::Completed;
        }

        env.storage().instance().set(&DataKey::Escrow(escrow_id), &escrow);
    }

    pub fn refund_escrow(env: Env, escrow_id: u64, client: Address) {
        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("escrow not found"));

        if escrow.client != client {
            panic!("unauthorized");
        }

        if escrow.status != EscrowStatus::AwaitingFunding {
            panic!("can only refund unfunded escrow");
        }

        escrow.refunded_amount = escrow.total_amount;
        escrow.status = EscrowStatus::Cancelled;

        env.storage().instance().set(&DataKey::Escrow(escrow_id), &escrow);
    }
}
