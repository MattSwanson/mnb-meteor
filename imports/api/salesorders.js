import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Items } from './items';
import { simpleItemSchema } from './schema/items.js';
import { SimpleSchema } from 'simpl-schema/dist/SimpleSchema';
import { SearchIndex } from './search';

export const SalesOrders = new Mongo.Collection('salesorders');

const salesOrderSchema = new SimpleSchema({
  custOrderNumber: String,
  orderDate: Date,
  customer: Object,
    'customer.refId': Object,
      'customer.refId._str': String,
    'customer.name': String,
  lineItems: {
    type: Array,
    minCount: 1
  },
  'lineItems.$': Object,
    'lineItems.$.status': String,
    'lineItems.$.reqDate': Date,
    'lineItems.$.uom': String,
    'lineItems.$.qty': { type: 'Number' },
    'lineItems.$.labelsPrinted': Boolean,
    'lineItems.$.item': simpleItemSchema
});

export const SalesOrderMethods = {
  updateLineItem: new ValidatedMethod({
    name: 'salesOrders.updateLineItem',
    validate: new SimpleSchema({
      lineItemId: String,
      newStatus: String
    }).validator(),
    run({ lineItemId, newStatus }){
      id = new Mongo.ObjectID(lineItemId);
      SalesOrders.update({
        lineItems: {
          $elemMatch: { _id: id }
        }
      }, {
          $set: { "lineItems.$.status" : newStatus }
      });
    }
  }),
  create: new ValidatedMethod({
    name: 'salesOrders.create',
    validate: salesOrderSchema.validator(),
    run(so){
      so._id = new Mongo.ObjectID();
      const result = SalesOrders.find({ number: so.custOrderNumber, customer: so.customer.refId }).fetch();
      if(result.length > 0){
        throw new Meteor.Error('po-exists', 'An order with that number and customer already exists');
      }
      so.lineItems.forEach((line) => {
        line._id = new Mongo.ObjectID();
      });
      return SalesOrders.insert(so, (err, res) => {
        if(err)
          return err;
        else{
          const entry = { 
            name: `${so.number}`,
            type: "Sales Orders",
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
  delete: new ValidatedMethod({
    name: 'salesOrders.delete',
    validate: new SimpleSchema({
      id: String
    }).validator(),
    run({ id }){
      id = new Mongo.ObjectID(id);
      return SalesOrders.remove({ _id: id }, (err, res) => {
        if(err)
          return err;
        else{
          //Delete the entry from the search index
          SearchIndex.remove({ recordId: id }, (err, res) => {
            if(err)
              return err;
          });
          return res;
        }
      });
    }
  }),
  deleteLineItem: new ValidatedMethod({
    name: 'salesOrders.deleteLineItem',
    validate: new SimpleSchema({
      lineId: String
    }).validator(),
    run({ lineId }){
      const id = new Mongo.ObjectID(lineId);
      SalesOrders.update({
        lineItems: {
          $elemMatch: { _id: id }
        }
      }, {
        $pull: {
          lineItems: { _id: id }
        }
      });
    }
  }),
  addLineItem: new ValidatedMethod({
    name: 'salesOrders.addLineItem',
    validate: new SimpleSchema({
      orderId: String,
      lineItem: Object,
      'lineItem.number': String,
      'lineItem.revision': String,
      'lineItem.reqDate': Date,
      'lineItem.qty': {
        type: 'Number'
      }
    }).validator(),
    run({ orderId, lineItem }){
      const orderObjectId = new Mongo.ObjectID(orderId);
      const item = Items.findOne({ number: lineItem.number, revision: lineItem.revision });
      let newLine = {
        status: "Open",
        reqDate: lineItem.reqDate,
        uom: "pcs",
        qty: lineItem.qty,
        _id: new Mongo.ObjectID(),
        labelsPrinted: false,
        item: {
          simpleDescription: item.simpleDescription,
          revision: item.revision,
          number: item.number,
          refId: item._id
        }
      };
      return SalesOrders.update({
        _id: orderObjectId
      }, {
        $push: {
          lineItems: newLine
        }
      }, {}, (err, res) => {
        if(err)
          return err;
        else
          return res;
      });
    }
  })
};

if(Meteor.isServer){
  Meteor.publish('salesorders', function salesOrdersPublication(){
    console.log("Publishing sales orders");
    return SalesOrders.find({});
  });

  Meteor.publish('openSalesOrders', function (){
    console.log("Publishing Open Line Items");
    return SalesOrders.find({
      lineItems: {
        $elemMatch: {
          status: { $in: ['Open', 'In Production', 'Waiting', 'Ready'] }
        }
      }
    }, {
      _id: 0,
      lineItems: 1
    });
  });

  Meteor.publish('singleSalesOrder', function(id){
    check(id, String);
    const oid = new Mongo.ObjectID(id);
    return SalesOrders.find(oid);
  });

  //TODO We need to update this to account for item aliases 
  Meteor.publish('salesOrdersContainingItems', function(id){
    check(id, String);
    console.log('Publishing Sales Orders Containing Items');

    // Get og item
    const itemId = new Mongo.ObjectID(id);
    const item = Items.findOne({ _id: itemId });
    let allIds = [itemId];
    if(item.aliases){
      allIds = item.aliases.reduce((acc, val) => {
        acc.push(val.refId);
        return acc;
      }, allIds);
    };

    // Check for aliases
    const items = Items.find({ _id: { $in: allIds }}, {_id: 0, 'usedIn.refId': 1, 'usedIn.quantityUsed': 1}).fetch();

    //var kitsIn = Items.find({ _id: new Mongo.ObjectID(id) }, {_id: 0, 'usedIn.refId': 1, 'usedIn.quantityUsed': 1}).fetch();
    let kitsIds = [];
    items.forEach((item) => {
      if(item.usedIn){
        kitsIds = item.usedIn.reduce((acc, val) => {
          acc.push(val.refId);
          return acc;
        }, kitsIds);
      }
    });
    // if(kitsIn[0].usedIn){
    //   kitsIds = kitsIn[0].usedIn.reduce((acc,val)=>{
    //     acc.push(val.refId);
    //     return acc;
    //   }, []);
    // }
    
    return SalesOrders.find({
      lineItems:{
        $elemMatch:{
          'item.refId': { $in: kitsIds },
          status: { $in: ["Open", "Waiting"]}
        }
      }
    });
  });
}