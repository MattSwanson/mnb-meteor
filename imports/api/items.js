import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const Items = new Mongo.Collection('items');

if(Meteor.isServer){
  Meteor.publish('singleItem', function(id){
    const itemId = new Mongo.ObjectID(id);
    return Items.find(itemId);
  });

  // Need to publish the item aliases else they wont be found on client side
  Meteor.publish('itemAliases', function(id){
    const baseId = new Mongo.ObjectID(id);
    const baseItem = Items.findOne(baseId);
    let aliasIds = baseItem.aliases.reduce((acc, val)=>{
      acc.push(val.refId);
      return acc;
    }, []);
    return Items.find({ _id: { $in: aliasIds }});
  });
}