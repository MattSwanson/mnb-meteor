import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './viewer.html';
import './partViewer.html';
import './kitViewer.html';
import { Items, ItemMethods } from '../../api/items';
import { SalesOrders } from '../../api/salesorders';
import { PurchaseOrders } from '../../api/purchaseorders';

import S3 from 'aws-sdk/clients/s3';
const s3Conf = Meteor.settings.public.s3 || {};

FlowRouter.route('/items/:id', {
  name: 'item',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
  action(){
    BlazeLayout.render('itemViewer');
  }
});

Template.itemViewer.onCreated(function(){
  this.autorun(function(){
    FlowRouter.watchPathChange();
    let id = FlowRouter.getParam('id');
    Meteor.subscribe('singleItem', id);
    Meteor.subscribe('itemAliases', id);
    // Get all sales orders with open lines containing kits using the item
    Meteor.subscribe('salesOrdersContainingItems', id);
    Meteor.subscribe('openPurchaseOrdersContainingItem', id);
    Meteor.subscribe('openPurchaseOrdersWithItemInProcess', id);
  })
});

Template.itemViewer.helpers({
  item(){
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    return Items.findOne({ _id: itemId}, { history: { $slice: 10 } });
  },

  // Get item history which includes it's aliases
  aHistory(){

    let history = [];
    try{
      // Get this items history
      const id = FlowRouter.getParam('id');
      const itemId = new Mongo.ObjectID(id);
      const baseItem = Items.findOne({_id: itemId});
      //const aliases = baseItem.aliases;
      const aliases = (baseItem.aliases) ? baseItem.aliases : [];
      if(baseItem.history)
        history = baseItem.history; //.fetch();
      history.forEach((shipment) => {
        shipment.itemNumber = baseItem.number;
        shipment.itemRevision = baseItem.revision;
      });
      // Step through each alias
      aliases.forEach((alias) => {
        let ai = Items.findOne({_id: alias.refId});
        //  -  get its history
        if(ai){
          let aliasHistory = ai.history;
          aliasHistory.forEach((shipment) => {
            shipment.itemNumber = alias.number;
            shipment.itemRevision = alias.revision;
          });
          // Combine all histories into one array
          history = history.concat(aliasHistory);
        }
      });
      // Sort the array by shipment date and then return it to the template
      history.sort((a,b)=>{
        return b.date - a.date;
      });
    }catch(err){
      console.error(err);
    }
    return history;
  },

  neededForKits(){
    // Since we have subscribed to a list of all sales orders which contain open lines
    // for kits which contain the item we are interested in, we can use that information
    // to calculate how many total pcs are needed to fulfill kit orders and show each line

    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);

    // Get a list of all ids of kits which the item is used in
    let item = Items.findOne({ _id: itemId });
    let itemIds = [item._id];
    if(item.aliases){
      itemIds = item.aliases.reduce((acc, alias) => { 
        acc.push(alias.refId);
        return acc;
      }, itemIds);
    }
    let allItems = Items.find({ _id: { $in: itemIds }}, { fields: { usedIn: 1 }}).fetch();
    let kitIds = allItems.reduce((acc, item) => {
      if(!item.usedIn) return acc;
      const usedInIds = item.usedIn.reduce((acc, kit) => {
        acc.push(kit.refId);
        return acc;
      }, []);
      return [...acc, ...usedInIds];
      //return (item.usedIn) ? [...acc, ...item.usedIn] : acc;
    }, []);
    // If this item is not used in kits just peace out of here
    if(kitIds.length <= 0)
       return [];

    // var kitIds = item.usedIn.reduce((acc, val) => {
    //   acc.push(val.refId);
    //   return acc;
    // }, []);
    // Make an array of key value pairs keyed by the id of the kit and the value will be the qty of the item
    // used in the kit - for later use

    let qtys = [];
    allItems.map( item => {
      if(item.usedIn){
        qtys = item.usedIn.reduce((acc, val) => {
          acc[val.refId.toHexString()] = val.quantityUsed;
          return acc;
        }, qtys);
      }
    });
    
    // const qtys = item.usedIn.reduce((acc, val) => {
    //   acc[val.refId.toHexString()] = val.quantityUsed;
    //   return acc;
    // }, []);
    // Make sure we are only getting the sales orders we want (should be all we have access to right now...)
    salesOrders = SalesOrders.find({
      lineItems: {
        $elemMatch: {
          'item.refId': {
            $in: kitIds
          },
          status: {
            $in: ["Open", "Waiting"]
          }
        }
      }
    }).fetch();
    // Convert our ids to hex string for future use
    kitIds = kitIds.map( (val) => { return val.toHexString(); } );
    // Reduce our sales orders down to just the lines containing kits containing our item !
    var lines = salesOrders.reduce((acc, val) => {
      val.lineItems.forEach((lineItem, index) => {
        // This should be able to refactored into one line but I couldn't get it to work properly
        // When the following two lines are nested in the comparisons? So here we are...
        // Make it work and then make it work better...
        var refIdStr = lineItem.item.refId.toHexString();
        var t = kitIds.indexOf(refIdStr);
        var s = ['Open', 'Waiting'].indexOf(lineItem.status);
        if((t > -1) && (s > -1)){ 
          lineItem.custOrderNumber = val.custOrderNumber;
          lineItem.refId = val._id;
          lineItem.totalQtyNeeded = qtys[refIdStr] * lineItem.qty;
          acc.push(lineItem);
        }
      });
      return acc;
    }, []);
    // Sort the lines by required date ascending
    lines.sort((a,b)=>{
      return a.reqDate - b.reqDate;
    });
    return lines;
  },

  
});

Template.partViewer.helpers({
  historyIsFromPO(lineItem){
    const a = ['Item Receipt', 'Processed'].indexOf(lineItem.transactionType);
    return (a > -1);
  },
  getPartsOnOrder(){
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    //const baseItem = Items.findOne({_id: itemId});
    //const aliases = baseItem.aliases;

    let pos = PurchaseOrders.find({
      $and: [
        { lineItems: { $elemMatch: { complete: false }}},
        { lineItems: { $elemMatch: { 'item.refId': itemId }}}
      ]
    },{ fields: { _id: 1, number: 1, lineItems: 1 }}).fetch();
    // Reduce down to just the line items for our item
    pos = pos.reduce((acc, val) => {
      val.lineItems.forEach((line) => {
        if(line.item.refId._str == itemId._str && line.complete == false){
          let newLine = {
            poId: val._id,
            poNumber: val.number,
            quantity: line.qty - line.recQty
          };
          acc.push(newLine);
        }
      });
      return acc;
    }, []);
    return pos;
  },

  getPartsInProcess(){
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    let pos = PurchaseOrders.find({
      $and: [
        { lineItems: { $elemMatch: { complete: false }}},
        { lineItems: { $elemMatch: { 'targetItem.refId': itemId }}}
      ]
    },{ fields: { _id: 1, number: 1, lineItems: 1 }}).fetch();
    pos = pos.reduce((acc, po) => {
      po.lineItems.forEach((line) => {
        if(line.targetItem.refId._str == itemId._str && line.complete == false){
          let newLine = {
            poId: po._id,
            poNumber: po.number,
            quantity: line.qty - line.recQty
          };
          acc.push(newLine);
        }
      });
      return acc;
    }, []);
    return pos;
  },
  getKitsUsedIn(){
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    let item = Items.findOne({ _id: itemId });
    let itemIds = [item._id];
    if(item.aliases){
      itemIds = item.aliases.reduce((acc, alias) => { 
        acc.push(alias.refId);
        return acc;
      }, itemIds);
    }
    let allItems = Items.find({ _id: { $in: itemIds }}, { fields: { usedIn: 1 }}).fetch();
    let usedIn = [];
    allItems.forEach((item) => {
      if(item.usedIn)
        usedIn = [...usedIn, ...item.usedIn];
    });
    return usedIn;
  },
  getPresignedS3URL(fileName){
    //Create S3 client
    const s3 = new S3({
      signatureVersion: 'v4',
      signatureCache: false,
      secretAccessKey: s3Conf.secret,
      accessKeyId: s3Conf.key,
      region: s3Conf.region,
      // httpOptions: {
      //   timeout: 6000,
      //   agent: false
      // }
    });

    // const params = {Bucket: s3Conf.bucket, Key: `docs/${fileName}`};
    // console.log(s3Conf);
    // // const url = s3.getSignedUrl('getObject', params, (err, data) => {
    // //   if(err)
    // //     return err;
    // //   else
    // //     console.log(data);
    // // });
    // // console.log(`Presigned URL= ${url}`);
    // s3.getObject(params, (err, data) => {
    //   if(err)
    //     return err;
    //   else
    //     console.log(data);
    // });

    // s3.listObjects({ Bucket: "mnbolt1", MaxKeys: 10}, (err, data) => {
    //   if(err)
    //     return err;
    //   else
    //     console.log(data);
    // })

    return url;
  }
});

Template.partViewer.events({
  'click .view-btn':function(event){
    const fileName = event.currentTarget.getAttribute('file-name');
    ItemMethods.getPresignedS3Url.call({fileName: fileName}, (err, res) => {
      if(err)
        console.error(err);
      else
        window.location = res.url;
    })
  }
});