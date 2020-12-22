import sinon, { SinonStub } from 'sinon';
import { Request, Response } from 'express-serve-static-core';

interface MockRequest extends Request {
  params: {
    [key: string]: string
  }
  body: {
    [key: string]: string
  }
}

const request = (params = {}, body = {}): MockRequest => ({
  params,
  body
}) as MockRequest;

interface MockResponse extends Response {
  status: SinonStub,
  json: SinonStub
}

const response = (): MockResponse => {
  const res = {} as MockResponse;
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

type MockNext = SinonStub;

const next = sinon.stub();

export {
  request,
  response,
  next,
  MockRequest,
  MockResponse,
  MockNext
};
