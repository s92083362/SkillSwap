import { createChatId } from '../chatUtils';

describe('chatUtils - createChatId', () => {
  it('creates same chat id regardless of order', () => {
    const id1 = createChatId('userA', 'userB');
    const id2 = createChatId('userB', 'userA');

    expect(id1).toBe('userA_userB');
    expect(id2).toBe('userA_userB');
  });

  it('joins user ids with underscore', () => {
    const id = createChatId('abc', 'xyz');
    expect(id).toBe('abc_xyz');
  });
});
