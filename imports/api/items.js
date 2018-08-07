import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const Items = new Mongo.Collection('items');

if(Meteor.isServer){
  Meteor.publish('singleItem', function(id){
    const itemId = new Mongo.ObjectID(id);
    return Items.find(itemId);
  });
}