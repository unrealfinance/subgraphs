import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  Core,
  EpochStarted,
  NewStream,
  Subscribed,
  Unsubscribed
} from "../generated/Core/Core"
import {User,Stream,Epoch } from "../generated/schema"

export function handleEpochStarted(event: EpochStarted): void {
  let epoch = Epoch.load(event.params.streamKey.toHex());
  let stream = Stream.load(event.params.streamKey.toHex())
  
  if (epoch == null) epoch = new Epoch(event.params.streamKey.toHex())

  epoch.stream = stream.id
  epoch.number = event.params.futureIndex + BigInt.fromString('1')
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
  }
  stream.meta = event.params.streamKey
  stream.save();
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
