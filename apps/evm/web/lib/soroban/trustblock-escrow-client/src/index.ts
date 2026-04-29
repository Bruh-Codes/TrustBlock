import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CAQGDVXYW6YHIMLXTNCINAPCZXZ37JKLACGEWXQULYJNAGB5JJBHV4NC",
  }
} as const


export interface Escrow {
  client: string;
  funded_amount: i128;
  id: u64;
  recipient: string;
  refunded_amount: i128;
  released_amount: i128;
  resolver: Option<string>;
  status: u32;
  title: string;
  total_amount: i128;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "NextEscrowId", values: void} | {tag: "Escrow", values: readonly [u64]} | {tag: "Milestones", values: readonly [u64]};


export interface Milestone {
  amount: i128;
  client_approved: boolean;
  id: u32;
  released: boolean;
  submitted: boolean;
  title: string;
}

export interface Client {
  /**
   * Construct and simulate a get_escrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_escrow: ({escrow_id}: {escrow_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Escrow>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a fund_escrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fund_escrow: ({escrow_id, client, amount}: {escrow_id: u64, client: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_escrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_escrow: ({client, recipient, resolver, title, milestone_titles, milestone_amounts}: {client: string, recipient: string, resolver: Option<string>, title: string, milestone_titles: Array<string>, milestone_amounts: Array<i128>}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a refund_escrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  refund_escrow: ({escrow_id, client}: {escrow_id: u64, client: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_milestones transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_milestones: ({escrow_id}: {escrow_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Milestone>>>

  /**
   * Construct and simulate a submit_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  submit_milestone: ({escrow_id, milestone_id, recipient}: {escrow_id: u64, milestone_id: u32, recipient: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a approve_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  approve_milestone: ({escrow_id, milestone_id, client}: {escrow_id: u64, milestone_id: u32, client: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a release_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  release_milestone: ({escrow_id, milestone_id, client}: {escrow_id: u64, milestone_id: u32, client: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_escrow: this.txFromJSON<Escrow>,
        initialize: this.txFromJSON<null>,
        fund_escrow: this.txFromJSON<null>,
        create_escrow: this.txFromJSON<u64>,
        refund_escrow: this.txFromJSON<null>,
        get_milestones: this.txFromJSON<Array<Milestone>>,
        submit_milestone: this.txFromJSON<null>,
        approve_milestone: this.txFromJSON<null>,
        release_milestone: this.txFromJSON<null>
  }
}