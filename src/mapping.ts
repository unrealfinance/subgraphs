import { BigInt, Address } from '@graphprotocol/graph-ts'
import {
  Core,
  EpochStarted,
  NewStream,
  Subscribed,
  Unsubscribed,
} from '../generated/Core/Core'
import { ERC20 } from '../generated/Core/ERC20'
import { User, Stream, Epoch, OTTOKEN, YieldToken, TokenSubscription } from '../generated/schema'
const coreAddress: Address = Address.fromString(
  '0x57c9e8D17bE3f506c6527e27362B905842E0340e',
)
export function handleEpochStarted(event: EpochStarted): void {
  let epoch = Epoch.load(event.params.streamKey.toHex())
  let stream = Stream.load(event.params.streamKey.toHex())

  if (epoch == null) epoch = new Epoch(event.params.streamKey.toHex())

  epoch.stream = stream.id
  epoch.number = event.params.futureIndex

  let core = Core.bind(coreAddress)

  let ytAddress = core.getYT(event.params.streamKey, event.params.futureIndex)

  let contract = ERC20.bind(ytAddress)
  let symbol = contract.symbol()
  let name = contract.name()

  let yieldToken = YieldToken.load(ytAddress.toHexString())
  if (yieldToken == null) {
    yieldToken = new YieldToken(ytAddress.toHexString())
    yieldToken.symbol = symbol
    yieldToken.name = name
    yieldToken.address = ytAddress.toHexString()
  }
  yieldToken.save()

  epoch.save()

  if (stream !== null)
    stream.epochs = stream.epochs.concat([event.params.streamKey.toHex()])
    stream.yieldToken = ytAddress.toHexString()


  stream.save()
}

export function handleNewStream(event: NewStream): void {
  let stream = Stream.load(event.params.streamKey.toHex())
  if (stream == null) {
    stream = new Stream(event.params.streamKey.toHex())
    stream.meta = event.params.streamKey
    stream.users = []
    stream.epochs = []
    stream.protocol = event.params.protocol
    stream.underlying = event.params.underlying.toHexString()
    stream.durationBlocks = event.params.durationBlocks
    let core = Core.bind(coreAddress)

    let OTaddress = core.getOT(event.params.streamKey)

    let contract = ERC20.bind(OTaddress)
    let symbol = contract.symbol()
    let name = contract.name()

    let otToken = OTTOKEN.load(OTaddress.toHexString())
    if (otToken == null) {
      otToken = new OTTOKEN(OTaddress.toHexString())
      otToken.symbol = symbol
      otToken.name = name
      otToken.address = OTaddress.toHexString()
    }
    otToken.save()
    stream.otToken = OTaddress.toHexString()
    stream.meta = event.params.streamKey
    stream.save()
  }
}
export function handleSubscribed(event: Subscribed): void {
  let subscription = TokenSubscription.load(event.params.streamKey.toHex() + event.params.user.toHex())
  if(subscription == null) {
    subscription = new TokenSubscription(event.params.streamKey.toHex() + event.params.user.toHex())
    subscription.user = event.params.user.toHex()
    subscription.stream  = event.params.streamKey.toHex()
    subscription.amount = event.params.amount;
  } else {
    subscription.amount =  subscription.amount.plus(event.params.amount);  
  }

  subscription.save()
  
  let stream = Stream.load(event.params.streamKey.toHex())
  let user = User.load(event.params.user.toHex())


  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.streams = []
    user.subscriptions = [event.params.streamKey.toHex() + event.params.user.toHex()]
  } else {
    user.subscriptions = user.subscriptions.concat([event.params.streamKey.toHex() + event.params.user.toHex()])
  }

  user.save()

  if (stream !== null) {
    user.streams = user.streams.concat([event.params.streamKey.toHex()])
    stream.users = stream.users.concat([event.params.user.toHex()])
    user.save()
    stream.save()
  }
}

export function handleUnsubscribed(event: Unsubscribed): void {
  let subscription = TokenSubscription.load(event.params.streamKey.toHex() + event.params.user.toHex())
  if(subscription !== null)
    subscription.amount =  subscription.amount.minus(event.params.amount);  

  subscription.save()
  let stream = Stream.load(event.params.streamKey.toHex())
  let user = User.load(event.params.user.toHex())
  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.streams = []
  }
  user.save()

  if (stream !== null) {
    let streamIndex = user.streams.indexOf(event.params.streamKey.toHexString())
    let users = stream.users

    const streams = user.streams
    if (streamIndex > -1) streams.splice(streamIndex, 1)

    const userIndex = stream.users.indexOf(event.params.user.toHexString())
    if (userIndex > -1) users.splice(userIndex, 1)

    user.streams = streams
    stream.users = users

    user.save()
    stream.save()
  }
}
