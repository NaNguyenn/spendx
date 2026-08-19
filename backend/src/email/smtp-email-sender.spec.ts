import * as nodemailer from 'nodemailer';
import { SmtpEmailSender } from './smtp-email-sender';

// Mocks the external service at the module boundary (rules/test-mock-external-services.md)
// rather than injecting a hand-rolled seam into SmtpEmailSender for it.
jest.mock('nodemailer');

describe('SmtpEmailSender', () => {
  const createTransport = jest.mocked(nodemailer.createTransport);
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
    createTransport.mockReturnValue({
      sendMail,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
  });

  it('creates the transporter from the given host and port', () => {
    new SmtpEmailSender({
      host: 'smtp.example.com',
      port: 2525,
      from: 'spendx <no-reply@spendx.local>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 2525,
    });
  });

  it('passes from/to/subject/text through to the transporter', async () => {
    const sender = new SmtpEmailSender({
      host: 'localhost',
      port: 1025,
      from: 'spendx <no-reply@spendx.local>',
    });

    await sender.send({
      to: 'user@example.com',
      subject: 'Welcome to spendx',
      text: 'Hello!',
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: 'spendx <no-reply@spendx.local>',
      to: 'user@example.com',
      subject: 'Welcome to spendx',
      text: 'Hello!',
    });
  });
});
