import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SalesOrders } from '../../api/salesorders.js';

import './schedule.html';

Template.registerHelper('subDate', (isoDate) => {
  return isoDate.toISOString().substring(0,10);
});

Template.registerHelper('rowClass', (status) => {
  switch(status){
    case 'Waiting':
      return "table-warning";
    case 'Ready':
      return "table-success";
    case 'In Production':
      return "table-danger";
    case 'Shipped':
      return "table-primary";
    case 'Closed':
      return "table-dark";
    default:
      return "";
  }
})

Template.schedule.onCreated(function(){
  console.log('Schedule template created');
  Meteor.subscribe('openSalesOrders');
});

Template.schedule.helpers({
  schedule(){
    console.log("Getting schedule...");

    // Get all salesorders containing open order lines
    const arr = SalesOrders.find({}).fetch();
    // Reduce the array to an array of just orderlines
    var flat = arr.reduce((acc, val)=>{  
      // Put the salesorder custOrderNumber into each orderline before its added to the array
      val.lineItems.forEach((line)=>{
        line.poNumber = val.custOrderNumber;
        line.orderId = val._id._str;
      });
      // Concat the orderlines to the accumulated array
      return [...acc, ...val.lineItems];
    }, []);
    
    // One more reduce to remove all the closed and shipped lines from the output
    var final = flat.reduce((acc, val) => {
      if(val.status != 'Closed' && val.status != 'Shipped')
        return acc.concat(val);
      else
        return acc;
    }, []);

    // Sort by due date ascending
    final.sort((a,b)=>{
      return a.reqDate - b.reqDate;
    });

    return final;
  }    
});

Template.schedule.events({
  'click .status-btn': function(event, template){
    newStatus = event.currentTarget.getAttribute("status");
    var proceed = true;
    if((newStatus.localeCompare("Shipped") == 0) || (newStatus.localeCompare("Closed") == 0)){
      proceed = confirm(`Are you sure you want to mark this line ${newStatus}?`);
    }
    if(proceed == true){
      Meteor.call('salesOrders.updateLineItem', {
        lineItemId: event.currentTarget.parentElement.getAttribute('line-id'),
        newStatus: newStatus
      }), (err, res) => {
        if(err){
          alert(err);
        } else { 
          // success
        }
      }
    }
  }
});
