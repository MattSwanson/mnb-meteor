import { Meteor } from 'meteor/meteor';
import { Companies } from '../../api/companies.js';
import { Items } from '../../api/items.js';

import './create.html';
import { SalesOrderMethods } from '../../api/salesorders.js';

FlowRouter.route('/createSo', {
  name: 'createSo',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
  action(){
    BlazeLayout.render('createSo');
  }
});

Template.createSo.onCreated(function(){
  Meteor.subscribe('activeRevisions');
  Meteor.subscribe('allCompanies');
});

Template.createSo.helpers({
  companies(){
    return Companies.find();
  }
});

Template.createSo.events({
  'click #add-line-btn': function(event){
    const tableBody = $(' .so-items-table tbody');
    Blaze.render(Template.soLineItemRow, tableBody[0]);
  },
  'click #remove-line-btn': function(){
    $(' .so-line-row').last().remove();
  },
  'submit form'(event, instance){
    event.preventDefault();
    const companyId = new Mongo.ObjectID(event.target.customer.value);
    const companyName = Companies.findOne({ _id: companyId }).name;
    let so = {
      custOrderNumber: event.target.poNumber.value.trim(),
      orderDate: new Date(),
      customer:{
        refId: companyId,
        name: companyName
      },
      lineItems: []
    }
    $('.so-line-row').map((index, element) => {
      const itemNumber = $(element).find('input[name=number]').val().trim();
      const revision = $(element).find('input[name=revision]').val().trim();
      const item = Items.findOne({ number: itemNumber, revision: revision });
      let itemObj = {
        number: itemNumber,
        revision: revision,
        refId: item._id,
        simpleDescription: item.simpleDescription
      };
      let lineItem = {
        uom: 'pcs',
        status: "Open",
        reqDate: new Date($(element).find('input[name=due-date]').val().trim()),
        qty: $(element).find('input[name=qty]').val().trim(),
        item: itemObj,
        labelsPrinted: false
      }
      so.lineItems.push(lineItem);
    });
    SalesOrderMethods.create.call(so, (err, res) => {
      if(err){
        if(err.error === "po-exists")
          alert('An order with that number for that customer already exists');
        else
          alert(err.message);
        return;
      }else{
        FlowRouter.go(`/salesOrders/${res._str}`);
      }
    });
  },
  'blur [name="number"]': function(event){
    let itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber });
    if(!item)
      $(event.currentTarget).closest('tr').find('input[name=revision]').val('');
   else
   {
      const rev = item.revision;
      $(event.currentTarget).closest('tr').find('input[name=revision]').val(rev);
   }
  }
});