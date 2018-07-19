import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const PurchaseOrders = new Mongo.Collection('purchaseorders');

if(Meteor.isServer){
  Meteor.publish('purchaseorders', function(){
    console.log("Publishing Purchase Orders");
    return PurchaseOrders.find({});
  });
}