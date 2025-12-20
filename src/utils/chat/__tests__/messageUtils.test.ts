// src/utils/chat/__tests__/messageUtils.test.ts

import {
    sendTextMessage,
    sendFileMessage,
    markMessagesAsRead,
  } from '../messageUtils'
  import {
    addDoc,
    setDoc,
    collection,
    doc,
    serverTimestamp,
    query,
    where,
    getDocs,
  } from 'firebase/firestore'
  import { uploadChatFileToCloudinary } from '@/lib/cloudinary/uploadChatFile'
  import type { ChatUser } from '@/utils/types/chat.types'
  
  // Mock Firebase
  jest.mock('firebase/firestore', () => ({
    addDoc: jest.fn(),
    setDoc: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    serverTimestamp: jest.fn(() => ({ _type: 'timestamp' })),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
  }))
  
  // Mock Cloudinary upload
  jest.mock('@/lib/cloudinary/uploadChatFile', () => ({
    uploadChatFileToCloudinary: jest.fn(),
  }))
  
  // Mock Firebase config
  jest.mock('@/lib/firebase/firebaseConfig', () => ({
    db: {},
  }))
  
  describe('messageUtils', () => {
    // Mock users
    const mockSender: ChatUser = {
      uid: 'sender-123',
      email: 'sender@example.com',
      displayName: 'John Doe',
    }
  
    const mockReceiver: ChatUser = {
      uid: 'receiver-456',
      email: 'receiver@example.com',
      displayName: 'Jane Smith',
    }
  
    const mockChatId = 'chat-789'
  
    beforeEach(() => {
      jest.clearAllMocks()
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'mock-doc-id' })
      ;(setDoc as jest.Mock).mockResolvedValue(undefined)
    })
  
    // ==========================================
    // sendTextMessage Tests
    // ==========================================
    describe('sendTextMessage', () => {
      const testMessage = 'Hello, how are you?'
  
      it('should send a text message successfully', async () => {
        await sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
  
        // Should call addDoc 3 times (message, global message, notification)
        expect(addDoc).toHaveBeenCalledTimes(3)
  
        // Should call setDoc once (update lastMessage)
        expect(setDoc).toHaveBeenCalledTimes(1)
      })
  
      it('should create message in privateChats collection', async () => {
        await sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
  
        // Check that the first call includes the message data
        const firstCall = (addDoc as jest.Mock).mock.calls[0]
        expect(firstCall[1]).toMatchObject({
          senderId: mockSender.uid,
          senderName: mockSender.displayName,
          content: testMessage,
          type: 'text',
          fileUrl: null,
          fileName: null,
        })
      })
  
      it('should create message in global messages collection', async () => {
        await sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
  
        // Check that the second call includes the global message data
        const secondCall = (addDoc as jest.Mock).mock.calls[1]
        expect(secondCall[1]).toMatchObject({
          senderId: mockSender.uid,
          receiverId: mockReceiver.uid,
          content: testMessage,
          type: 'text',
          conversationId: mockChatId,
          read: false,
        })
      })
  
      it('should create a notification for receiver', async () => {
        await sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
  
        // Check that the third call includes the notification data
        const thirdCall = (addDoc as jest.Mock).mock.calls[2]
        expect(thirdCall[1]).toMatchObject({
          userId: mockReceiver.uid,
          type: 'chat',
          title: 'New Message',
          chatId: mockChatId,
          senderId: mockSender.uid,
          senderName: mockSender.displayName,
          read: false,
        })
      })
  
      it('should update lastMessage in chat document', async () => {
        await sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
  
        const setDocCall = (setDoc as jest.Mock).mock.calls[0]
        expect(setDocCall[1]).toMatchObject({
          lastMessage: testMessage,
        })
      })
  
      it('should truncate long messages in notification', async () => {
        const longMessage = 'a'.repeat(100)
        await sendTextMessage(mockSender, mockReceiver, longMessage, mockChatId)
  
        const notificationCall = (addDoc as jest.Mock).mock.calls.find(
          (call) => call[1].type === 'chat'
        )
  
        expect(notificationCall[1].message).toContain('...')
        expect(notificationCall[1].message.length).toBeLessThan(200)
      })
  
      it('should handle user without displayName', async () => {
        const userWithoutName: ChatUser = {
          uid: 'user-999',
          email: 'user@example.com',
          displayName: null,
        }
  
        await sendTextMessage(userWithoutName, mockReceiver, testMessage, mockChatId)
  
        // Check that at least one call has senderName as 'Anonymous'
        const allCalls = (addDoc as jest.Mock).mock.calls
        const hasAnonymous = allCalls.some(call => call[1]?.senderName === 'Anonymous')
        expect(hasAnonymous).toBe(true)
      })
  
      it('should throw error on Firebase failure', async () => {
        const mockError = new Error('Firebase error')
        ;(addDoc as jest.Mock).mockRejectedValueOnce(mockError)
  
        await expect(
          sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
        ).rejects.toThrow('Firebase error')
      })
  
      it('should use serverTimestamp for all timestamps', async () => {
        await sendTextMessage(mockSender, mockReceiver, testMessage, mockChatId)
  
        expect(serverTimestamp).toHaveBeenCalled()
  
        // Check all addDoc calls have timestamp
        const addDocCalls = (addDoc as jest.Mock).mock.calls
        addDocCalls.forEach((call) => {
          expect(call[1]).toHaveProperty('timestamp')
        })
      })
    })
  
    // ==========================================
    // sendFileMessage Tests
    // ==========================================
    describe('sendFileMessage', () => {
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      })
      const mockCaption = 'Check out this photo!'
  
      beforeEach(() => {
        ;(uploadChatFileToCloudinary as jest.Mock).mockResolvedValue({
          url: 'https://cloudinary.com/image.jpg',
          resourceType: 'image',
        })
      })
  
      it('should send file message successfully', async () => {
        await sendFileMessage(
          mockSender,
          mockReceiver,
          mockFile,
          mockCaption,
          mockChatId
        )
  
        expect(uploadChatFileToCloudinary).toHaveBeenCalledWith(mockFile)
        expect(addDoc).toHaveBeenCalledTimes(3)
        expect(setDoc).toHaveBeenCalledTimes(1)
      })
  
      it('should reject files larger than 10MB', async () => {
        const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
          type: 'image/jpeg',
        })
  
        await expect(
          sendFileMessage(
            mockSender,
            mockReceiver,
            largeFile,
            mockCaption,
            mockChatId
          )
        ).rejects.toThrow('File size must be less than 10MB')
  
        expect(uploadChatFileToCloudinary).not.toHaveBeenCalled()
      })
  
      it('should handle image files correctly', async () => {
        await sendFileMessage(
          mockSender,
          mockReceiver,
          mockFile,
          mockCaption,
          mockChatId
        )
  
        const firstCall = (addDoc as jest.Mock).mock.calls[0]
        expect(firstCall[1]).toMatchObject({
          type: 'image',
          fileUrl: 'https://cloudinary.com/image.jpg',
          fileName: 'test.jpg',
          content: mockCaption,
        })
      })
  
      it('should handle non-image files correctly', async () => {
        const pdfFile = new File(['pdf content'], 'document.pdf', {
          type: 'application/pdf',
        })
        ;(uploadChatFileToCloudinary as jest.Mock).mockResolvedValue({
          url: 'https://cloudinary.com/document.pdf',
          resourceType: 'raw',
        })
  
        await sendFileMessage(
          mockSender,
          mockReceiver,
          pdfFile,
          mockCaption,
          mockChatId
        )
  
        const firstCall = (addDoc as jest.Mock).mock.calls[0]
        expect(firstCall[1]).toMatchObject({
          type: 'file',
          fileName: 'document.pdf',
        })
      })
  
      it('should use filename as content when no caption provided for files', async () => {
        const pdfFile = new File(['pdf content'], 'report.pdf', {
          type: 'application/pdf',
        })
        ;(uploadChatFileToCloudinary as jest.Mock).mockResolvedValue({
          url: 'https://cloudinary.com/report.pdf',
          resourceType: 'raw',
        })
  
        await sendFileMessage(
          mockSender,
          mockReceiver,
          pdfFile,
          '',
          mockChatId
        )
  
        const firstCall = (addDoc as jest.Mock).mock.calls[0]
        expect(firstCall[1]).toMatchObject({
          content: 'report.pdf',
        })
      })
  
      it('should use empty content for images without caption', async () => {
        await sendFileMessage(mockSender, mockReceiver, mockFile, '', mockChatId)
  
        const firstCall = (addDoc as jest.Mock).mock.calls[0]
        expect(firstCall[1]).toMatchObject({
          content: '',
          type: 'image',
        })
      })
  
      it('should create appropriate notification for image', async () => {
        await sendFileMessage(
          mockSender,
          mockReceiver,
          mockFile,
          mockCaption,
          mockChatId
        )
  
        const thirdCall = (addDoc as jest.Mock).mock.calls[2]
        expect(thirdCall[1]).toMatchObject({
          title: 'New Photo',
        })
        expect(thirdCall[1].message).toContain('sent you a photo')
      })
  
      it('should create appropriate notification for file', async () => {
        const pdfFile = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' })
        ;(uploadChatFileToCloudinary as jest.Mock).mockResolvedValue({
          url: 'https://cloudinary.com/doc.pdf',
          resourceType: 'raw',
        })
  
        await sendFileMessage(
          mockSender,
          mockReceiver,
          pdfFile,
          '',
          mockChatId
        )
  
        const thirdCall = (addDoc as jest.Mock).mock.calls[2]
        expect(thirdCall[1]).toMatchObject({
          title: 'New File',
        })
        expect(thirdCall[1].message).toContain('sent you a file')
      })
  
      it('should update lastMessage with photo emoji for images', async () => {
        await sendFileMessage(
          mockSender,
          mockReceiver,
          mockFile,
          mockCaption,
          mockChatId
        )
  
        const setDocCall = (setDoc as jest.Mock).mock.calls[0]
        expect(setDocCall[1]).toMatchObject({
          lastMessage: '📷 Photo',
        })
      })
  
      it('should update lastMessage with filename for files', async () => {
        const pdfFile = new File(['pdf'], 'report.pdf', {
          type: 'application/pdf',
        })
        ;(uploadChatFileToCloudinary as jest.Mock).mockResolvedValue({
          url: 'https://cloudinary.com/report.pdf',
          resourceType: 'raw',
        })
  
        await sendFileMessage(
          mockSender,
          mockReceiver,
          pdfFile,
          '',
          mockChatId
        )
  
        const setDocCall = (setDoc as jest.Mock).mock.calls[0]
        expect(setDocCall[1]).toMatchObject({
          lastMessage: '📎 report.pdf',
        })
      })
  
      it('should throw error if upload fails', async () => {
        const uploadError = new Error('Upload failed')
        ;(uploadChatFileToCloudinary as jest.Mock).mockRejectedValue(uploadError)
  
        await expect(
          sendFileMessage(
            mockSender,
            mockReceiver,
            mockFile,
            mockCaption,
            mockChatId
          )
        ).rejects.toThrow('Upload failed')
      })
    })
  
    // ==========================================
    // markMessagesAsRead Tests
    // ==========================================
    describe('markMessagesAsRead', () => {
      const userId = 'user-123'
      const otherUserId = 'user-456'
  
      it('should mark all unread messages as read', async () => {
        const mockDocs = [
          { id: 'msg-1', data: () => ({ read: false }) },
          { id: 'msg-2', data: () => ({ read: false }) },
          { id: 'msg-3', data: () => ({ read: false }) },
        ]
  
        ;(getDocs as jest.Mock).mockResolvedValue({
          docs: mockDocs,
        })
  
        await markMessagesAsRead(userId, otherUserId)
  
        // Should call setDoc for each unread message
        expect(setDoc).toHaveBeenCalledTimes(3)
  
        // Check that each call has the correct structure
        mockDocs.forEach((mockDoc, index) => {
          const call = (setDoc as jest.Mock).mock.calls[index]
          expect(call[1]).toEqual({ read: true })
          expect(call[2]).toEqual({ merge: true })
        })
      })
  
      it('should query for unread messages correctly', async () => {
        ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })
  
        await markMessagesAsRead(userId, otherUserId)
  
        expect(query).toHaveBeenCalled()
        expect(where).toHaveBeenCalledWith('receiverId', '==', userId)
        expect(where).toHaveBeenCalledWith('senderId', '==', otherUserId)
        expect(where).toHaveBeenCalledWith('read', '==', false)
      })
  
      it('should handle case with no unread messages', async () => {
        ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })
  
        await markMessagesAsRead(userId, otherUserId)
  
        expect(setDoc).not.toHaveBeenCalled()
      })
  
      it('should update all messages in parallel', async () => {
        const mockDocs = [
          { id: 'msg-1', data: () => ({}) },
          { id: 'msg-2', data: () => ({}) },
        ]
  
        ;(getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs })
  
        await markMessagesAsRead(userId, otherUserId)
  
        // All setDoc calls should be made (Promise.all behavior)
        expect(setDoc).toHaveBeenCalledTimes(2)
      })
  
      it('should throw error on Firebase failure', async () => {
        const mockError = new Error('Firebase query failed')
        ;(getDocs as jest.Mock).mockRejectedValue(mockError)
  
        await expect(markMessagesAsRead(userId, otherUserId)).rejects.toThrow(
          'Firebase query failed'
        )
      })
  
      it('should throw error if setDoc fails', async () => {
        const mockDocs = [{ id: 'msg-1', data: () => ({}) }]
        ;(getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs })
  
        const setDocError = new Error('Update failed')
        ;(setDoc as jest.Mock).mockRejectedValue(setDocError)
  
        await expect(markMessagesAsRead(userId, otherUserId)).rejects.toThrow(
          'Update failed'
        )
      })
    })
  
    // ==========================================
    // Integration-style Tests
    // ==========================================
    describe('Integration scenarios', () => {
      it('should handle complete message flow', async () => {
        const message = 'Hello!'
  
        await sendTextMessage(mockSender, mockReceiver, message, mockChatId)
  
        // Verify complete flow
        expect(addDoc).toHaveBeenCalledTimes(3) // message, global, notification
        expect(setDoc).toHaveBeenCalledTimes(1) // lastMessage update
        expect(serverTimestamp).toHaveBeenCalled()
      })
  
      it('should handle file upload and message flow', async () => {
        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
        ;(uploadChatFileToCloudinary as jest.Mock).mockResolvedValue({
          url: 'https://cloudinary.com/test.jpg',
          resourceType: 'image',
        })
  
        await sendFileMessage(mockSender, mockReceiver, file, 'Caption', mockChatId)
  
        expect(uploadChatFileToCloudinary).toHaveBeenCalledWith(file)
        expect(addDoc).toHaveBeenCalledTimes(3)
        expect(setDoc).toHaveBeenCalledTimes(1)
      })
    })
  })