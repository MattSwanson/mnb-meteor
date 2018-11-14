import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import { SearchIndex } from './search';

export const Items = new Mongo.Collection('items');
export const Materials = new Mongo.Collection('materials');
export const Coatings = new Mongo.Collection('coatings');
export const SecondaryProcesses = new Mongo.Collection('secondaryProcesses');

if(Meteor.isServer){
  Meteor.publish('singleItem', function(id){
    const itemId = new Mongo.ObjectID(id);
    return Items.find(itemId);
  });

  // Need to publish the item aliases else they wont be found on client side
  Meteor.publish('itemAliases', function(id){
    const baseId = new Mongo.ObjectID(id);
    const baseItem = Items.findOne(baseId);
    if(!baseItem.aliases)
      return [];
    let aliasIds = baseItem.aliases.reduce((acc, val)=>{
      acc.push(val.refId);
      return acc;
    }, []);
    return Items.find({ _id: { $in: aliasIds }});
  });

  Meteor.publish('itemNeeds', function(){
    console.log('Publishing Item Needs');
    return Items.find({ needs: { $exists: true, $ne: [] }});
  });

  Meteor.publish('materials', function(){
    console.log('Publishing Item Materials');
    return Materials.find({}, { sort: { name: 1 }});
  });

  Meteor.publish('coatings', function(){
    console.log('Publishing Item Coatings');
    return Coatings.find({}, { sort: { name: 1 }});
  });

  Meteor.publish('secondaryProcesses', function(){
    console.log('Publishing Secondary Processes');
    return SecondaryProcesses.find({}, { sort: { name: 1 }});
  });

  Meteor.publish('activeRevisions', function(){
    console.log('Publishing Active Revisions');
    return Items.find({ isActive: true }, { fields: { _id: 1, number: 1, revision: 1, simpleDescription: 1, cost: 1, salePrice: 1, part: 1 }});
  });

  Meteor.methods({
    'item.createPart': function(obj){
      obj._id = new Mongo.ObjectID();
      const result = Items.find({ number: obj.number, revision: obj.revision}).fetch();
      if(result.length > 0){
        throw new Meteor.Error('item-revision-exists', 'Item revision already exists in collection');
      }
      return Items.insert(obj, (err, res) => {
        if(err)
          return err;
        else{
          const entry = {
            name: `${obj.number} - ${obj.revision} - ${obj.simpleDescription}`,
            type: "Item",
            recordId: res
          };
          SearchIndex.insert(entry, (err, r) => {
            if(err)
              return err;
          });
          return res;
        }
      });
    },
    'item.newMaterial': function({ name }){
      const newId = Materials.insert({ _id: new Mongo.ObjectID(), name: name });
      return newId;
    },
    'item.newCoating': function({ name }){
      const newId = Coatings.insert({ _id: new Mongo.ObjectID(), name: name });
      return newId;
    },
    'item.newProcess': function({ name }){
      const newId = SecondaryProcesses.insert({ _id: new Mongo.ObjectID(), name: name });
      return newId;
    },
    // This could be the same as the createPart function since they are both add items -
    // But at some point when we validate these they need to valdiated differently so we'll
    // Just make them separate functions for now anyhow...
    'item.createKit': function(item){
      item._id = new Mongo.ObjectID();
      const result = Items.find({ number: item.number, revision: item.revision}).fetch();
      if(result.length > 0){
        throw new Meteor.Error('item-revision-exists', 'Item revision already exists in collection');
      }
      return Items.insert(item, (err, res) => {
        if(err)
          return err;
        else{
          const entry = {
            name: `${item.number} - ${item.revision} - ${item.simpleDescription}`,
            type: "Item",
            recordId: res
          };
          SearchIndex.insert(entry, (err, r) => {
            if(err)
              return err;
          });
          return res;
        }
      });
    }
  });
}