import './itemNeedsTable.html';
import { ItemMethods } from '../../../api/items';

Template.itemNeedsTable.events({
  'click i#deleteNeedLine': function(event){
    if(confirm('Are you sure you want to delete this line?')){
      const id = $(event.currentTarget).closest('tr').attr('line-id');
      ItemMethods.deleteNeedLine.call({
        id: id
      }, (err, res) => {
        if(err)
          alert(err);
      });
    }
  },
  'click i.add-note': function(event){
    const id = $(event.currentTarget).closest('tr').attr('line-id');
    $('.add-note-dialog input#line-id').val(id);
    $('.add-note-dialog').modal('show');
  },
  'submit form.add-note-form': function(event){
    event.preventDefault();
    ItemMethods.addNeedLineNote.call({
      id: $('.add-note-dialog input#line-id').val(),
      note: event.target.note.value.trim()
    }, (err, res) => {
      if(err)
        alert(err);
      else{
        $('.add-note-dialog').modal('hide');
      }
    })
  },
  'click i#deleteNote': function(event){
    if(confirm('Are you sure you want to delete this note?')){
      ItemMethods.deleteNeedLineNote.call({
        id: event.currentTarget.getAttribute('note-id')
      }, (err, res) => {
        if(err)
          alert(err);
      })
    }
  },
  'click i.link-po': function(event){
    //Hide all other related po table rows
    $('tbody').removeClass('show-pos');
    $(event.currentTarget).closest('tbody').addClass('show-pos');
  },
  'click button.link-po': function(event){
    const id = $(event.currentTarget).closest('tr').attr('parent-id');
    $('.link-po-dialog input#line-id').val(id);
    $('.link-po-dialog').modal('show');
  },
  'submit form.link-po-form': function(event){
    event.preventDefault();
    let poNumber = event.target.poNumber.value.trim();
    const id = $('.link-po-dialog input#line-id').val();
    return ItemMethods.linkPoToNeedLine.call({
      id: id,
      poNumber: poNumber
    }, (err, res) => {
      if(err)
        alert(err);
      else{
        $('.link-po-dialog').modal('hide');
      }
    })
  },
  'click i#unlinkPo': function(event){
    if(confirm('Are you sure you want to unlink this PO?')){
      ItemMethods.unlinkPoFromNeedLine.call({
        id: event.currentTarget.getAttribute('link-id')
      }, (err, res) => {
        if(err)
          alert(err);
      });
    }
  },
  'click .status-btn': function(event){
    newStatus = event.currentTarget.getAttribute("status");
    // Compare against current status
    // If different call the method to update the status
    ItemMethods.updateNeedLineStatus.call({
      id: event.currentTarget.parentElement.getAttribute('line-id'),
      newStatus: newStatus
    }, (err, res) => {
      if(err)
        alert(err);
    })
    // Otherwise do nothing and close the dropdown
  }
})