import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Items } from './items';
import { simpleItemSchema } from './schema/items.js';
import { SearchIndex } from './search';
import { SimpleSchema } from 'simpl-schema/dist/SimpleSchema';

export const PurchaseOrders = new Mongo.Collection('purchaseorders');

const itemLineSchema = new SimpleSchema({
  reqDate: Date,
  qty: { type: 'Number' },
  uom: String,
  item: {
    type: simpleItemSchema,
    optional: true
  },
  targetItem: { 
    type: simpleItemSchema,
    optional: true
  },
  process: {
    type: 'String',
    optional: true
  }
});

const purchaseOrderSchema = new SimpleSchema({
  number: String,
  shipVia: String,
  terms: String,
  orderDate: Date,
  vendor: Object,
    'vendor.refId': Object,
      'vendor.refId._str': String,
    'vendor.name': String,
  lineItems: {
    type: Array,
    minCount: 1
  },
  // Not validating lineItem objects until I can figure out how to validate
  // between two different object types using oneOf or custom validation
  'lineItems.$': itemLineSchema
});


export const PurchaseOrderMethods = {
  receiveItem: new ValidatedMethod({
    name: 'purchaseOrders.receiveItem',
    validate: new SimpleSchema({
      lineId: String,
      recdQty: Number,
      recdDate: Date
    }).validator(),
    run({ lineId, recdQty, recdDate }){
      id = new Mongo.ObjectID(lineId);
      const po = PurchaseOrders.findOne({ 
        lineItems: {
          $elemMatch: { _id: id }
        }
      }, { fields: {
        number: 1,
        lineItems: 1
      }});
      // Since we can't use the positional operator on the client side we have to get the whole
      // lineItems array and find our line ourselves...
      const orderLine = po.lineItems.find((e) => {
        return e._id._str == lineId;
      });
      const newQty = orderLine.recQty + recdQty;
      PurchaseOrders.update({
        lineItems: {
          $elemMatch: { _id: id }
        }
      }, {
        $set: { "lineItems.$.recQty" : newQty }
      });
      const recpt = {
        uom: "pc",
        quantity: recdQty,
        transactionType: "Item Receipt",
        linkedOrder: {
          refNumber: po.number,
          refId: po._id
        },
        date: new Date(recdDate)
      };
      const refId = (orderLine.process) ? orderLine.targetItem.refId : orderLine.item.refId
      Items.update({ _id: refId },{
        $push: {
          history: recpt
        }
      })
      return "Success";
    }
  }),
  deleteLineItem: new ValidatedMethod({
    name: 'purchaseOrders.deleteLineItem',
    validate: new SimpleSchema({
      lineId: String
    }).validator(),
    run({ lineId }){
      const id = new Mongo.ObjectID(lineId);
      PurchaseOrders.update({
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
  create: new ValidatedMethod({
    name: 'purchaseOrders.create',
    validate: purchaseOrderSchema.validator(),
    run(po){
      // There is some information we need to get to fill in here first
      // We need descriptions and ref ids for ta
      po._id = new Mongo.ObjectID();
      // Inject ids into line items for later use
      po.lineItems.forEach((line) => {
        line._id = new Mongo.ObjectID();
        line.recQty = 0;
      });
      const result = PurchaseOrders.find({ number: po.number }).fetch();
      if(result.length > 0){
        throw new Meteor.Error('po-exists', 'An order with that number already exists');
      }
      return PurchaseOrders.insert(po, (err, res) => {
        if(err)
          return err;
        else{
          const entry = {
            name: `${po.number}`,
            type: "Purchase Order",
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
    name: 'purchaseOrders.delete',
    validate: new SimpleSchema({
      id: String
    }).validator(),
    run({ id }){
      id = new Mongo.ObjectID(id);
      PurchaseOrders.remove({ _id: id }, (err, res) => {
        if(err)
          return err;
        else{
          SearchIndex.remove({ recordId: id }, (err, res) => {
            if(err)
              return err;
          });
          return res;
        }
      });
    }
  }),
  addLineItem: new ValidatedMethod({
    name: 'purchaseOrders.addLineItem',
    validate: new SimpleSchema({
      orderId: String,
      line: Object,
      'line.qty': {
        type: 'Number'
      },
      'line.number': String,
      'line.revision': String,
      'line.reqDate': Date,
      'line.process': {
        type: String,
        optional: true
      }
    }).validator(),
    run({ orderId, line }){
      const orderObjId = new Mongo.ObjectID(orderId);
      const item = Items.findOne({ number: line.number, revision: line.revision });
      let newLine = {
        _id: new Mongo.ObjectID(),
        recQty: 0,
        reqDate: line.reqDate,
        qty: line.qty,
        complete: false,
        uom: 'pcs'
      };
      const itemObj = {
        simpleDescription: item.simpleDescription,
        revision: item.revision,
        number: item.number,
        refId: item._id
      }
      if(line.process){
        newLine.targetItem = itemObj;
        newLine.process = line.process;
      }else{
        newLine.item = itemObj;
      }
      return PurchaseOrders.update({
        _id: orderObjId
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
}

if(Meteor.isServer){
  Meteor.publish('purchaseorders', function(){
    console.log("Publishing Purchase Orders");
    return PurchaseOrders.find({});
  });

  Meteor.publish('openPurchaseOrders', function(){
    return PurchaseOrders.find({
      lineItems: {
        $elemMatch: {
          complete: false
        }
      }
    });
  });

  Meteor.publish('singlePurchaseOrder', function(id){
    
    const oid = new Mongo.ObjectID(id);
    return PurchaseOrders.find(oid);
  });

  Meteor.publish('openPurchaseOrdersContainingItem', function(id){
    check(id, String);
    oid = new Mongo.ObjectID(id);
    return PurchaseOrders.find({
      $and: [
        { lineItems: { $elemMatch: { complete: false }}},
        { lineItems: { $elemMatch: { 'item.refId': oid }}}
      ]
    });
  });

  Meteor.publish('openPurchaseOrdersWithItemInProcess', function(id){
    check(id, String);
    oid = new Mongo.ObjectID(id);
    return PurchaseOrders.find({
      $and: [
        { lineItems: { $elemMatch: { complete: false }}},
        { lineItems: { $elemMatch: { 'targetItem.refId': oid }}}
      ]
    });
  });
}