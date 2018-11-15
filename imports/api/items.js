import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import SimpleSchema from 'simpl-schema';

import { SearchIndex } from './search';

export const Items = new Mongo.Collection('items');
export const Materials = new Mongo.Collection('materials');
export const Coatings = new Mongo.Collection('coatings');
export const SecondaryProcesses = new Mongo.Collection('secondaryProcesses');

// Schema for minimum information required to create an item
const itemSchema = new SimpleSchema({
  number: String,
  revision: String,
  simpleDescription: String,
  specialInstructions: {
    type: Array,
    optional: true
  },
  'specialInstructions.$': String,
  effectiveDate: Date,
  cost: { 
    type: 'Number',
    optional: true,
    defaultValue: 0,
  }, 
  salePrice: { 
    type: 'Number',
    optional: true,
    defaultValue: 0,
  },
  isActive: {
    type: Boolean,
    optional: true,
    defaultValue: true
  }
});

// This schema is used for places where references to other items are used
const simpleItemSchema = new SimpleSchema({
  number: String,
  revision: String,
  simpleDescription: String,
  refId: Object,
  'refId._str': String
});

const partSchema = new SimpleSchema({
  part: Object,
    'part.description': String,
    'part.size': String,
    'part.origin': String,
    'part.material': String,
    'part.coating': String,
    'part.additionalProcess': String,
  location: Object,
    'location.shelfId': String,
    'location.shelfNum': Number
});
partSchema.extend(itemSchema);

const kitSchema = new SimpleSchema({
  kit: Object,
    'kit.cartonQty': Number,
    'kit.carton': String,
    'kit.packaging': String,
    'kit.name': String,
    'kit.contents': {
      type: Array,
      minCount: 1
    },
    'kit.contents.$': Object,
      'kit.contents.$.bagName': String,
      'kit.contents.$.items': {
        type: Array,
        minCount: 1
      },
      'kit.contents.$.items.$': Object,
        'kit.contents.$.items.$.uom': String,
        'kit.contents.$.items.$.qty': { type: 'Number' },
        'kit.contents.$.items.$.item': simpleItemSchema
});
kitSchema.extend(itemSchema);

export const ItemMethods = {
  addMaterial: new ValidatedMethod({
    name: 'items.addMaterial',
    validate: new SimpleSchema({
      name: { type: 'String' }
    }).validator(),
    run({ name }) {
      return Materials.insert({ _id: new Mongo.ObjectID(), name: name });
    }
  }),
  addCoating: new ValidatedMethod({
    name: 'items.addCoating',
    validate: new SimpleSchema({
      name: { type: 'String' }
    }).validator(),
    run({ name }) {
      return Coatings.insert({ _id: new Mongo.ObjectID(), name: name });
    }
  }),
  addProcess: new ValidatedMethod({
    name: 'items.addProcess',
    validate: new SimpleSchema({
      name: { type: 'String' }
    }).validator(),
    run({ name }){
      return SecondaryProcesses.insert({ _id: new Mongo.ObjectID(), name: name });
    }
  }),
  createPart: new ValidatedMethod({
    name: 'items.createPart',
    validate: partSchema.validator(),
    run(obj){
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
    }
  }),
  createKit: new ValidatedMethod({
    name: 'items.createKit',
    validate: kitSchema.validator(),
    run(item){
      item._id = new Mongo.ObjectID();
      kitSchema.clean(item);
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
  })
};

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
}