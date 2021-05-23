import { BigInt ,log,Address} from "@graphprotocol/graph-ts"
import {
  
  Core,
  EpochStarted,
  NewStream,
  Subscribed,
  Unsubscribed
} from "../generated/Core/Core"
import {ERC20} from '../generated/Core/ERC20'
import {User,Stream,Epoch,OTTOKEN, YieldToken } from "../generated/schema"
const coreAddress:Address =  Address.fromString('0xbf5292d67eC2752bAb725F63e2f571fdC64D2997');
export function handleEpochStarted(event: EpochStarted): void {

  let epoch = Epoch.load(event.params.streamKey.toHex());
  let stream = Stream.load(event.params.streamKey.toHex())

  if (epoch == null) epoch = new Epoch(event.params.streamKey.toHex())

  epoch.stream = stream.id
  epoch.number = event.params.futureIndex + BigInt.fromString('1')
  
  let core = Core.bind(coreAddress);
  
  let ytAddress = core.getYT(event.params.streamKey,event.params.futureIndex);

  let contract = ERC20.bind(ytAddress)
  let symbol = contract.symbol()
  let name = contract.name();

  let yieldToken = YieldToken.load(ytAddress.toHexString())
  if (yieldToken == null) {
    yieldToken = new YieldToken(ytAddress.toHexString())
    yieldToken.symbol = symbol
    yieldToken.name = name
  }
  yieldToken.save()

  
  epoch.save()
  
  if (stream !== null) stream.epochs = stream.epochs.concat([event.params.streamKey.toHex()])
  
  stream.save()
  
}

export function handleNewStream(event: NewStream): void {
  let stream = Stream.load(event.params.streamKey.toHex())
  if (stream == null) {
    stream = new Stream(event.params.streamKey.toHex())
    stream.meta = event.params.streamKey
    stream.users = []
    stream.epochs = []

  let core = Core.bind(coreAddress);
  
  let OTaddress = core.getOT(event.params.streamKey);

  let contract = ERC20.bind(OTaddress)
  let symbol = contract.symbol()
  let name = contract.name();

  let otToken = OTTOKEN.load(OTaddress.toHexString())
  if (otToken == null) {
    otToken = new OTTOKEN(OTaddress.toHexString())
    otToken.symbol = symbol
    otToken.name = name
  }
  otToken.save()

  stream.meta = event.params.streamKey
  stream.save();
}
}
export function handleSubscribed(event: Subscribed): void {

  let stream = Stream.load(event.params.streamKey.toHex())
  let user = User.load(event.params.user.toHex())
  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.streams = []
  }
  user.save()

  if(stream !== null) {
    user.streams = user.streams.concat([event.params.streamKey.toHex()])
    stream.users = stream.users.concat([event.params.user.toHex()])
    user.save()
    stream.save()
  }
}


export function handleUnsubscribed(event: Unsubscribed): void {
  let stream = Stream.load(event.params.streamKey.toHex())
  let user = User.load(event.params.user.toHex())
  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.streams = []
  }
  user.save()

  if(stream !== null) {
      let streamIndex = user.streams.indexOf(event.params.streamKey.toHexString());
      let users = stream.users;

      const streams = user.streams;
      if (streamIndex > -1) streams.splice(streamIndex, 1);
      
      const userIndex = stream.users.indexOf(event.params.user.toHexString());
      if (userIndex > -1) users.splice(userIndex, 1);
      
      user.streams = streams;
      stream.users = users;

    user.save()
    stream.save()
  }
}
