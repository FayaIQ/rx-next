const assert = require('node:assert/strict');
const phoneKey = value => String(value ?? '').replace(/\D/g,'').replace(/^00/,'').replace(/^964/,'').replace(/^0+/,'');
function assertTarget(account,{doctorId,protectedDoctorId,expectedPhone,originalAccount=false}) {
  assert(Number.isSafeInteger(doctorId)&&doctorId>0&&Number.isSafeInteger(protectedDoctorId)&&protectedDoctorId>0);
  assert(account && account.type === 'doctor','Doctor account required');
  assert(account.active_session_id !== 'rx-public-demo-session' && !['7000000000','7000000001'].includes(phoneKey(account.phone_number)), 'Public demo accounts are forbidden');
  if(originalAccount) {
    assert.equal(doctorId,protectedDoctorId,'Explicit original target does not match');
    assert(expectedPhone && phoneKey(expectedPhone)===phoneKey(account.phone_number),'Exact original account identity required');
  } else {
    assert.notEqual(doctorId,protectedDoctorId,'The original account is protected during preview');
    assert.equal(account.account_mode,'test','Private test account required');
    if(expectedPhone)assert.equal(phoneKey(expectedPhone),phoneKey(account.phone_number),'Target identity does not match');
  }
}
module.exports={assertTarget};
