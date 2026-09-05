const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
    email: z.string().email('ایمیل نامعتبر است'),
    password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
    role: z.enum(['STUDENT', 'PROFESSOR', 'ADMIN']).optional().default('STUDENT')
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('ایمیل نامعتبر است'),
    password: z.string().min(1, 'رمز عبور الزامی است')
  })
});

const createConversationSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional()
  })
});

const sendMessageSchema = z.object({
  params: z.object({ conversationId: z.string().uuid() }),
  body: z.object({
    content: z.string().min(1, 'متن پیام نمی‌تواند خالی باشد').max(10000, 'پیام خیلی طولانی است (حداکثر ۱۰,۰۰۰ کاراکتر)')
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional()
  })
});

const shareConversationSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    isVisible: z.boolean().optional().default(true)
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  createConversationSchema,
  sendMessageSchema,
  updateProfileSchema,
  shareConversationSchema
};
