import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Items } from './items';

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
    }
  });
}