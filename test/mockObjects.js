const sinon = require('sinon');

const request = (params) => ({
  params
});

const response = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

module.exports = {
  request,
  response
};
