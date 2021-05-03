import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  Core,
  FutureStarted,
  NewStreamCreated,
  NewSubscription,
  Unsubscribed
} from "../generated/Core/Core"
import {User,Stream,Epoch } from "../generated/schema"

export function handleFutureStarted(event: FutureStarted): void {
  let epoch = Epoch.load(event.params.metadata.toHex());
  let stream = Stream.load(event.params.metadata.toHex())
  
  if (epoch == null) epoch = new Epoch(event.params.metadata.toHex())

  epoch.stream = stream.id
  epoch.number = event.params.futureIndex + BigInt.fromString('1')
  epoch.save()
  
  if (stream !== null) stream.epochs = stream.epochs.concat([event.params.metadata.toHex()])
  
  stream.save()
  
}

export function handleNewStreamCreated(event: NewStreamCreated): void {
  let stream = Stream.load(event.params.metadata.toHex())
  if (stream == null) {
    stream = new Stream(event.params.metadata.toHex())
    stream.meta = event.params.metadata
    stream.users = []
    stream.epochs = []
  }
  stream.meta = event.params.metadata
  stream.save();
}

export function handleNewSubscription(event: NewSubscription): void {

  let stream = Stream.load(event.params.metadata.toHex())
  let user = User.load(event.params.user.toHex())
  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.streams = []
  }
  user.save()

  if(stream !== null) {
    user.streams = user.streams.concat([event.params.metadata.toHex()])
    stream.users = stream.users.concat([event.params.user.toHex()])
    user.save()
    stream.save()
  }
}


export function handleUnsubscribed(event: Unsubscribed): void {
  let stream = Stream.load(event.params.metadata.toHex())
  let user = User.load(event.params.user.toHex())
  if (user == null) {
    user = new User(event.params.user.toHex())
    user.address = event.params.user
    user.streams = []
  }
  user.save()

  if(stream !== null) {
      let streamIndex = user.streams.indexOf(event.params.metadata.toHexString());
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
