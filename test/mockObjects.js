const sinon = require('sinon');

const request = (params = {}, body = {}) => ({
  params,
  body
});

const response = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

const next = sinon.stub();

module.exports = {
  request,
  response,
  next
};
