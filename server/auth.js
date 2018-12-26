import { SimpleSchema } from 'simpl-schema/dist/SimpleSchema';

Accounts.validateNewUser((user) => {
  new SimpleSchema({
    _id: { type: String },
    emails: { type: Array },
    'emails.$': { type:Object },
    'emails.$.address': { type: String },
    'emails.$.verified': { type: Boolean },
    createdAt: { type: Date },
    services: { type: Object, blackbox: true },
    profile: { type: Object, blackbox: true }
  }).validate(user);

  return true;
});