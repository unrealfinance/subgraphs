import { BigInt, Address, log } from '@graphprotocol/graph-ts'
import {
  Core,
  EpochStarted,
  NewStream,
  Deposited,
  PrincipleRedeemed,
  YieldRedeemed
} from '../generated/Core/Core'
import { ERC20 } from '../generated/Core/ERC20'
import { User, Stream, Epoch, OwnerShipToken, YieldToken, TokenSubscription } from '../generated/schema'
const coreAddress: Address = Address.fromString(
  '0x210f83DaC34A15e6ac2B804045B2891Cfc3b2940',
)

export function handleNewStream(event: NewStream): void {
  // fetch stream
  let stream = Stream.load(event.params.streamKey.toHex())

  // create one if dosen't exist
  if (stream == null) {
    stream = new Stream(event.params.streamKey.toHex())
    stream.meta = event.params.streamKey
    stream.epochs = []
    stream.protocol = event.params.protocol
    stream.underlying = event.params.underlying.toHexString()
    stream.durationBlocks = event.params.durationBlocks
    stream.startBlockNumber = event.block.number
    stream.save()
  }
}

export function handleEpochStarted(event: EpochStarted): void {
  // fetch stream and epoch
  const epochId = event.params.streamKey.toHex() + "-" + event.params.futureIndex.toHexString()
  let epoch = Epoch.load(epochId)
  let stream = Stream.load(event.params.streamKey.toHex())

  // Create epoch
  if (epoch == null) epoch = new Epoch(epochId)
  epoch.stream = stream.id
  epoch.number = event.params.futureIndex
  epoch.startBlockNumber = event.block.number
  epoch.tvl = BigInt.fromI32(0)

  // fetch OwnershipToken address for the epoch
  let core = Core.bind(coreAddress)
  let OTaddress = core.getOT(event.params.streamKey, event.params.futureIndex)
  let contractOt = ERC20.bind(OTaddress)

  // create Ownershiptoken
  let otToken = OwnerShipToken.load(OTaddress.toHexString())
  if (otToken == null) {
    otToken = new OwnerShipToken(OTaddress.toHexString())
    otToken.symbol = contractOt.symbol()
    otToken.name = contractOt.name()
    otToken.address = OTaddress.toHexString()
  }
  otToken.epoch = epoch.id
  otToken.save()

  // Add otaddress to epoch
  epoch.otToken = OTaddress.toHexString()
  epoch.save()

  // fetch yieldToken address for the epoch
  let ytAddress = core.getYT(event.params.streamKey, event.params.futureIndex)
  let contract = ERC20.bind(ytAddress)
  let symbol = contract.symbol()
  let name = contract.name()

  // create yield token
  let yieldToken = YieldToken.load(ytAddress.toHexString())
  if (yieldToken == null) {
    yieldToken = new YieldToken(ytAddress.toHexString())
    yieldToken.symbol = symbol
    yieldToken.name = name
    yieldToken.address = ytAddress.toHexString()
    yieldToken.stream = event.params.streamKey.toHex()
    yieldToken.epoch = epoch.id
  }
  yieldToken.save()

  // add ytAddress to epoch
  epoch.yieldToken = ytAddress.toHexString()
  epoch.save()

  // add epoch to stream
  if (stream !== null)
    stream.epochs = stream.epochs.concat([epochId])

  // update current epoch
  stream.currentEpoch = event.params.streamKey.toHex() + "-" + event.params.futureIndex.toHexString()
  stream.save()
}

export function handleDeposited(event: Deposited): void {
  // fetch subscription and epoch
  const subscriptionId = event.params.streamKey.toHex() + event.params.user.toHex() + event.params.EpochId.toHexString()
  const epochId = event.params.streamKey.toHex() + "-" + event.params.EpochId.toHexString()
  let subscription = TokenSubscription.load(subscriptionId)
  let epoch = Epoch.load(epochId)

  // Add the amount deposited to Total value (TVL)
  epoch.tvl = epoch.tvl.plus(event.params.amount)
  epoch.save()

  // If subscription dosen't exist create one else add amount to existing subscription
  if (subscription == null) {
    subscription = new TokenSubscription(subscriptionId)
    subscription.user = event.params.user.toHex()
    subscription.stream = event.params.streamKey.toHex()
    subscription.amount = event.params.amount;
    subscription.epoch = epochId;
    subscription.redeemPrinciple = false;
    subscription.redeemYield = false;
  } else {
    subscription.amount = subscription.amount.plus(event.params.amount);
  }

  subscription.save()

  // fetch user and subscription
  let user = User.load(event.params.user.toHex())

  // If user dosen't exist create one else add subscription
  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.subscriptions = [subscriptionId]
  } else {
    user.subscriptions = user.subscriptions.concat([subscriptionId])
  }

  user.save()
}

export function handlePrincipleRedeemed(event: PrincipleRedeemed): void {
  // fetch subscription and user
  const subscriptionId = event.params.streamKey.toHex() + event.params.user.toHex() + event.params.epoch.toHexString()
  let subscription = TokenSubscription.load(subscriptionId)
  let user = User.load(event.params.user.toHex())

  // remove subscription amount and set redeemPrinciple
  if (subscription !== null) {
    subscription.amount = subscription.amount.minus(event.params.amount);
    subscription.redeemPrinciple = true
  }

  // remove subscription from user
  if (user !== null && subscription.redeemPrinciple && subscription.redeemYield) {
    const subscriptionIndex = user.subscriptions.indexOf(subscriptionId);
    if (subscriptionIndex > -1) user.subscriptions.splice(subscriptionIndex, 1)
  }

  subscription.save()
  user.save()
}

export function handleYeildRedeemed(event: PrincipleRedeemed): void {
  // fetch subscription and user
  const subscriptionId = event.params.streamKey.toHex() + event.params.user.toHex() + event.params.epoch.toHexString()
  let subscription = TokenSubscription.load(subscriptionId)
  let user = User.load(event.params.user.toHex())

  // set redeemYield
  if (subscription !== null) {
    subscription.redeemYield = true
  }

  // remove subscription from user
  if (user !== null && subscription.redeemPrinciple && subscription.redeemYield) {
    const subscriptionIndex = user.subscriptions.indexOf(subscriptionId);
    if (subscriptionIndex > -1) user.subscriptions.splice(subscriptionIndex, 1)
  }

  subscription.save()
  user.save()
}