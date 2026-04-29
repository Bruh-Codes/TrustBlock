import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import { network } from "hardhat";

const {
  ethers,
  networkHelpers,
} = await network.connect();

const ESCROW_STATUS = {
  DRAFT: 0n,
  AWAITING_FUNDING: 1n,
  LIVE: 2n,
  IN_REVIEW: 3n,
  DISPUTED: 4n,
  COMPLETED: 5n,
  CANCELLED: 6n,
} as const;

const MILESTONE_STATUS = {
  PENDING: 0n,
  IN_REVIEW: 1n,
  APPROVED: 2n,
  RELEASED: 3n,
  REFUNDED: 4n,
  DISPUTED: 5n,
  RESOLVED: 6n,
  CANCELLED: 7n,
} as const;

const GLOBAL_RELEASE_RULE = {
  DUAL_APPROVAL: 0,
  CLIENT_APPROVAL_AND_TIMEOUT: 1,
} as const;

const MILESTONE_RELEASE_RULE = {
  CLIENT_APPROVAL: 0,
  BOTH_PARTIES_APPROVE: 1,
  CLIENT_APPROVAL_OR_TIMEOUT: 2,
  CUSTOM: 3,
} as const;

const REFUND_POLICY = {
  ON_EXPIRY_IF_UNAPPROVED: 0,
  MEDIATOR_CAN_SPLIT_REFUND: 1,
  MANUAL_ONLY: 2,
} as const;

const RESOLVER_TYPE = {
  NONE: 0,
  PLATFORM: 1,
  INDEPENDENT: 2,
} as const;

describe("Escrow", function () {
  async function deployFixture() {
    const [owner, client, recipient, resolver, outsider] =
      await ethers.getSigners();

    const token = await ethers.deployContract("TestToken", [
      "Mock USD Coin",
      "mUSDC",
      6,
    ]);

    const escrowImplementation = await ethers.deployContract("Escrow");
    const initData = escrowImplementation.interface.encodeFunctionData(
      "initialize",
      [owner.address],
    );

    const proxy = await ethers.deployContract("TransparentUpgradeableProxy", [
      await escrowImplementation.getAddress(),
      owner.address,
      initData,
    ]);

    const escrow = await ethers.getContractAt("Escrow", await proxy.getAddress());
    const reader = await ethers.deployContract("EscrowReader", [
      await escrow.getAddress(),
    ]);

    const million = ethers.parseUnits("1000000", 6);
    await token.mint(client.address, million);

    await escrow
      .connect(owner)
      .setResolverConfig(
        RESOLVER_TYPE.INDEPENDENT,
        resolver.address,
        150,
        "Independent resolver",
        true,
      );

    return { owner, client, recipient, resolver, outsider, token, escrow, reader };
  }

  async function createEscrowDraft() {
    const fixture = await networkHelpers.loadFixture(deployFixture);
    const { client, recipient, token, escrow } = fixture;

    const latest = BigInt(await networkHelpers.time.latest());
    const fundingDeadline = latest + 3n * 24n * 60n * 60n;

    const firstAmount = ethers.parseUnits("600", 6);
    const secondAmount = ethers.parseUnits("400", 6);
    const totalAmount = firstAmount + secondAmount;

    const createTx = await escrow.connect(client).createEscrow(
      {
        title: "Design sprint escrow",
        description: "Five-week milestone contract",
        clientName: "NexaPay Treasury",
        recipientName: "Sandline Studio",
        recipient: recipient.address,
        token: await token.getAddress(),
        totalAmount,
        fundingDeadline,
        defaultReleaseRule: GLOBAL_RELEASE_RULE.DUAL_APPROVAL,
        refundPolicy: REFUND_POLICY.ON_EXPIRY_IF_UNAPPROVED,
        resolverType: RESOLVER_TYPE.INDEPENDENT,
      },
      [
        {
          title: "Discovery",
          description: "Kickoff and scope lock",
          amount: firstAmount,
          dueDate: fundingDeadline + 2n * 24n * 60n * 60n,
          releaseRule: MILESTONE_RELEASE_RULE.CLIENT_APPROVAL,
          releaseCondition: "",
        },
        {
          title: "Final delivery",
          description: "Final files and handoff",
          amount: secondAmount,
          dueDate: fundingDeadline + 6n * 24n * 60n * 60n,
          releaseRule: MILESTONE_RELEASE_RULE.BOTH_PARTIES_APPROVE,
          releaseCondition: "",
        },
      ],
    );

    await token.connect(client).approve(await escrow.getAddress(), totalAmount);

    return {
      ...fixture,
      createTx,
      fundingDeadline,
      firstAmount,
      secondAmount,
      totalAmount,
      escrowId: 1n,
      firstMilestoneId: 1n,
      secondMilestoneId: 2n,
    };
  }

  it("creates an escrow and exposes the UI read model through EscrowReader", async function () {
    const {
      client,
      recipient,
      resolver,
      token,
      escrow,
      reader,
      createTx,
      totalAmount,
      escrowId,
      firstMilestoneId,
    } = await createEscrowDraft();

    await expect(createTx)
      .to.emit(escrow, "EscrowCreated")
      .withArgs(
        escrowId,
        client.address,
        recipient.address,
        await token.getAddress(),
        totalAmount,
        anyValue,
        RESOLVER_TYPE.INDEPENDENT,
      );

    const escrowView = await reader.getEscrow(escrowId);

    expect(escrowView.summary.id).to.equal(escrowId);
    expect(escrowView.summary.client).to.equal(client.address);
    expect(escrowView.summary.recipient).to.equal(recipient.address);
    expect(escrowView.summary.token).to.equal(await token.getAddress());
    expect(escrowView.summary.totalAmount).to.equal(totalAmount);
    expect(escrowView.summary.status).to.equal(ESCROW_STATUS.AWAITING_FUNDING);
    expect(escrowView.summary.milestoneCount).to.equal(2n);
    expect(escrowView.summary.resolver).to.equal(resolver.address);
    expect(escrowView.text.title).to.equal("Design sprint escrow");
    expect(escrowView.milestoneIds).to.deep.equal([firstMilestoneId, 2n]);
    expect(escrowView.milestones).to.have.length(2);
    expect(escrowView.milestones[0].text.title).to.equal("Discovery");
    expect(escrowView.milestones[1].text.title).to.equal("Final delivery");
  });

  it("funds the escrow and indexes it for all participants", async function () {
    const { client, recipient, resolver, escrow, escrowId, totalAmount } =
      await createEscrowDraft();

    await expect(escrow.connect(client).fundEscrow(escrowId))
      .to.emit(escrow, "EscrowFunded")
      .withArgs(escrowId, client.address, totalAmount);

    const summary = await escrow.getEscrowSummary(escrowId);
    expect(summary.fundedAmount).to.equal(totalAmount);
    expect(summary.status).to.equal(ESCROW_STATUS.LIVE);

    expect(await escrow.getEscrowIdsForParticipant(client.address)).to.deep.equal([
      escrowId,
    ]);
    expect(
      await escrow.getEscrowIdsForParticipant(recipient.address),
    ).to.deep.equal([escrowId]);
    expect(
      await escrow.getEscrowIdsForParticipant(resolver.address),
    ).to.deep.equal([escrowId]);
  });

  it("releases a milestone after submission and approval", async function () {
    const { client, recipient, token, escrow, escrowId, firstMilestoneId, firstAmount } =
      await createEscrowDraft();

    await escrow.connect(client).fundEscrow(escrowId);
    await escrow.connect(recipient).submitMilestone(firstMilestoneId);
    await escrow.connect(client).approveMilestone(firstMilestoneId);

    await expect(escrow.connect(client).releaseMilestone(firstMilestoneId))
      .to.emit(escrow, "FundsReleased")
      .withArgs(firstMilestoneId, escrowId, recipient.address, firstAmount);

    const milestone = await escrow.getMilestoneSummary(firstMilestoneId);
    const summary = await escrow.getEscrowSummary(escrowId);

    expect(milestone.status).to.equal(MILESTONE_STATUS.RELEASED);
    expect(summary.releasedAmount).to.equal(firstAmount);
    expect(await token.balanceOf(recipient.address)).to.equal(firstAmount);
    expect(summary.status).to.equal(ESCROW_STATUS.LIVE);
  });

  it("refunds an expired milestone back to the client", async function () {
    const { client, token, escrow, escrowId, firstMilestoneId, firstAmount } =
      await createEscrowDraft();

    await escrow.connect(client).fundEscrow(escrowId);

    const firstMilestone = await escrow.getMilestoneSummary(firstMilestoneId);
    await networkHelpers.time.increaseTo(BigInt(firstMilestone.dueDate) + 1n);

    await expect(escrow.connect(client).refundMilestone(firstMilestoneId))
      .to.emit(escrow, "FundsRefunded")
      .withArgs(firstMilestoneId, escrowId, client.address, firstAmount);

    const milestone = await escrow.getMilestoneSummary(firstMilestoneId);
    const summary = await escrow.getEscrowSummary(escrowId);

    expect(milestone.status).to.equal(MILESTONE_STATUS.REFUNDED);
    expect(summary.refundedAmount).to.equal(firstAmount);
    expect(summary.status).to.equal(ESCROW_STATUS.LIVE);
  });

  it("resolves a dispute through the configured resolver", async function () {
    const {
      client,
      recipient,
      resolver,
      token,
      escrow,
      escrowId,
      firstMilestoneId,
      firstAmount,
    } = await createEscrowDraft();

    await escrow.connect(client).fundEscrow(escrowId);
    await escrow.connect(recipient).submitMilestone(firstMilestoneId);
    await escrow.connect(client).openDispute(firstMilestoneId, "Scope disagreement");

    const recipientPortion = ethers.parseUnits("350", 6);
    const clientPortion = firstAmount - recipientPortion;

    await expect(
      escrow
        .connect(resolver)
        .resolveDispute(
          firstMilestoneId,
          recipientPortion,
          clientPortion,
          "Split based on accepted work",
        ),
    )
      .to.emit(escrow, "DisputeResolved")
      .withArgs(
        firstMilestoneId,
        escrowId,
        resolver.address,
        recipientPortion,
        clientPortion,
        "Split based on accepted work",
      );

    const milestone = await escrow.getMilestoneSummary(firstMilestoneId);
    const summary = await escrow.getEscrowSummary(escrowId);

    expect(milestone.status).to.equal(MILESTONE_STATUS.RESOLVED);
    expect(summary.releasedAmount).to.equal(recipientPortion);
    expect(summary.refundedAmount).to.equal(clientPortion);
    expect(summary.status).to.equal(ESCROW_STATUS.LIVE);
    expect(await token.balanceOf(recipient.address)).to.equal(recipientPortion);
  });

  it("rejects escrow creation when milestone totals do not match", async function () {
    const { client, recipient, token, escrow } =
      await networkHelpers.loadFixture(deployFixture);
    const latest = BigInt(await networkHelpers.time.latest());

    await expect(
      escrow.connect(client).createEscrow(
        {
          title: "Broken escrow",
          description: "Totals do not match",
          clientName: "Client",
          recipientName: "Recipient",
          recipient: recipient.address,
          token: await token.getAddress(),
          totalAmount: ethers.parseUnits("1000", 6),
          fundingDeadline: latest + 3600n,
          defaultReleaseRule: GLOBAL_RELEASE_RULE.DUAL_APPROVAL,
          refundPolicy: REFUND_POLICY.ON_EXPIRY_IF_UNAPPROVED,
          resolverType: RESOLVER_TYPE.NONE,
        },
        [
          {
            title: "Only milestone",
            description: "Incorrect total",
            amount: ethers.parseUnits("999", 6),
            dueDate: latest + 7200n,
            releaseRule: MILESTONE_RELEASE_RULE.CLIENT_APPROVAL,
            releaseCondition: "",
          },
        ],
      ),
    ).to.be.revertedWithCustomError(escrow, "MilestoneAmountMismatch");
  });
});
