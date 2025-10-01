import mongoose, { Schema, Document } from 'mongoose';

// Email Address Schema
const EmailAddressSchema = new Schema({
  address: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  }
}, { _id: false });

// Email Body Schema
const EmailBodySchema = new Schema({
  content: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['text/plain', 'text/html'],
    default: 'text/html',
  }
}, { _id: false });

// Email From Schema
const EmailFromSchema = new Schema({
  emailAddress: {
    type: EmailAddressSchema,
    required: true,
  }
}, { _id: false });

// Main Email Document Interface
export interface IEmail extends Document {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name?: string;
    }
  };
  body: {
    content: string;
    contentType: 'text/plain' | 'text/html';
  };
  receivedDateTime: string;
  bodyPreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Email Schema
const EmailSchema = new Schema<IEmail>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  from: {
    type: EmailFromSchema,
    required: true,
  },
  body: {
    type: EmailBodySchema,
    required: true,
  },
  receivedDateTime: {
    type: String,
    required: true,
  },
  bodyPreview: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Newsletter Section Schema
const NewsletterSectionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'newsletter-overview',
      'header', 
      'rundown-topics',  // This is where parseIntro results go!
      'latest-developments',
      'quick-hits',
      'community',
      'footer'
    ],
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: true,
    min: 0,
  }
}, { _id: false });

// Extracted Link Schema
const ExtractedLinkSchema = new Schema({
  url: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  section: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['news', 'tutorial', 'vendor', 'community', 'tool'],
  }
}, { _id: false });

// Parsed Newsletter Document Interface
export interface IParsedNewsletter extends Document {
  id: string;
  emailId: string;
  sender: string;
  subject: string;
  date: string;
  parserUsed: string;
  sections: Array<{
    type: 'newsletter-overview' | 'header' | 'rundown-topics' | 'latest-developments' | 'quick-hits' | 'community' | 'footer';
    title: string;
    content: string;
    order: number;
  }>;
  links: Array<{
    url: string;
    text: string;
    section: string;
    category: 'news' | 'tutorial' | 'vendor' | 'community' | 'tool';
  }>;
  parsedAt: Date;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Parsed Newsletter Schema
const ParsedNewsletterSchema = new Schema<IParsedNewsletter>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  emailId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
  },
  parserUsed: {
    type: String,
    required: true,
    trim: true,
  },
  sections: {
    type: [NewsletterSectionSchema],
    required: true,
    validate: {
      validator: function(sections: unknown[]) {
        return Array.isArray(sections) && sections.length > 0;
      },
      message: 'At least one section is required'
    }
  },
  links: {
    type: [ExtractedLinkSchema],
    default: [],
  },
  parsedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  version: {
    type: String,
    required: true,
    trim: true,
  }
}, {
  timestamps: true,
});

// Indexes for better performance
EmailSchema.index({ 'from.emailAddress.address': 1 });
EmailSchema.index({ receivedDateTime: -1 });
ParsedNewsletterSchema.index({ sender: 1 });
ParsedNewsletterSchema.index({ parsedAt: -1 });

// Models
export const Email = mongoose.models.Email || mongoose.model<IEmail>('Email', EmailSchema);
export const ParsedNewsletter = mongoose.models.ParsedNewsletter || mongoose.model<IParsedNewsletter>('ParsedNewsletter', ParsedNewsletterSchema);