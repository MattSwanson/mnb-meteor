import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './needs.html';
import { Items, ItemMethods } from '../../api/items';

var ItemNeeds = new Mongo.Collection('itemNeeds');

FlowRouter.route('/itemNeeds', {
  name: 'itemNeeds',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
  action(){
    BlazeLayout.render('itemNeeds');
  }
});

Template.itemNeeds.onCreated(function(){
  this.autorun(function(){
    //FlowRouter.watchPathChange();
    //let id = FlowRouter.getParam('id');
    //Meteor.subscribe('singleItem', id);
    //Meteor.subscribe('itemAliases', id);
    Meteor.subscribe('itemNeeds');
    Meteor.subscribe('activeRevisions');
  })
});

Template.itemNeeds.helpers({
  needs(){
    const arr = Items.find({ needs: { $exists: true, $ne: [] }}, { fields: { _id: 1, number: 1, needs: 1 }}).fetch();
    // Each item could have multiple need lines so we need to reduce this make them separate rows since the dates will likely be different
    var flat = arr.reduce((acc, val) => {
      val.needs.forEach((line)=>{
        line.number = val.number;
        line.revision = val.revision;
        line.itemId = val._id;
      });
      return [...acc, ...val.needs];
    }, []);
    flat.sort((a,b)=>{
      return a.needDate - b.needDate;
    })
    return flat;
  }
});

Template.itemNeeds.events({
  'click .add-need-line': function(event){
    $('.add-dialog').modal('show');
  },
  'submit form': function(event){
    event.preventDefault();
    let d = new Date(event.target.reqDate.value.trim());
    if(isNaN(d.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    ItemMethods.addNeedLine.call({
      number: event.target.number.value.trim(),
      revision: event.target.revision.value.trim(),
      qty: event.target.qty.value.trim(),
      reqDate: d
    }, (err, res) =>{
      if(err)
        alert(err);
      else
        $('.add-dialog').modal('hide');
    })
  },
  'blur [name="number"]': function(event){
    const itemNumber = event.currentTarget.value.trim();
    const item = Items.findOne({ number: itemNumber, isActive: true });
    if(!item){
      $(event.currentTarget).closest('div').find('input[name=revision]').val('');
    }else{
      const rev = item.revision;
      $(event.currentTarget).closest('div').find('input[name=revision]').val(rev);
    }
  }
})