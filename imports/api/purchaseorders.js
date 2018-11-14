import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Items } from './items';
import { SearchIndex } from './search';

export const PurchaseOrders = new Mongo.Collection('purchaseorders');

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
    oid = new Mongo.ObjectID(id);
    return PurchaseOrders.find({
      $and: [
        { lineItems: { $elemMatch: { complete: false }}},
        { lineItems: { $elemMatch: { 'item.refId': oid }}}
      ]
    });
  });

  Meteor.publish('openPurchaseOrdersWithItemInProcess', function(id){
    oid = new Mongo.ObjectID(id);
    return PurchaseOrders.find({
      $and: [
        { lineItems: { $elemMatch: { complete: false }}},
        { lineItems: { $elemMatch: { 'targetItem.refId': oid }}}
      ]
    });
  });

  Meteor.methods({
    'purchaseOrders.receiveItem'({ lineId, recdQty, recdDate }){
      console.log(lineId);
      id = new Mongo.ObjectID(lineId);
      const po = PurchaseOrders.find({ 
        lineItems: {
          $elemMatch: { _id: id }
        }
      }, { fields: {
        number: 1,
        'lineItems.$': 1
      }}).fetch();
      const newQty = po[0].lineItems[0].recQty + Number(recdQty);
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
          refNumber: po[0].number,
          refId: po[0]._id
        },
        date: new Date(recdDate)
      };
      const refId = (po[0].lineItems[0].process) ? po[0].lineItems[0].targetItem.refId : po[0].lineItems[0].item.refId
      Items.update({ _id: refId },{
        $push: {
          history: recpt
        }
      })
      return "Success";
    },
    'purchaseOrders.deleteLineItem'({ lineId }){
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
    },
    'purchaseOrders.create'(po){
      // There is some information we need to get to fill in here first
      // We need descriptions and ref ids for ta
      po._id = new Mongo.ObjectID();
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
  });
}