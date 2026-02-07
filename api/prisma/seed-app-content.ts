/**
 * Seed script for App Content
 * Run with: npx ts-node prisma/seed-app-content.ts
 */

import { PrismaClient, AppContentType } from '@prisma/client';

const prisma = new PrismaClient();

// OSS Licenses content based on actual dependencies from iris_mobile/pubspec.yaml
const ossLicensesContent = `# Open Source Licenses

IRIS Engage uses the following open source software:

---

## Flutter SDK
**License:** BSD-3-Clause
**Copyright:** The Flutter Authors
**Source:** https://github.com/flutter/flutter

---

## State Management

### flutter_riverpod
**License:** MIT
**Copyright:** Remi Rousselet
**Source:** https://pub.dev/packages/flutter_riverpod

---

## Networking & API

### dio
**License:** MIT
**Copyright:** flutterchina.club
**Source:** https://pub.dev/packages/dio

### web_socket_channel
**License:** BSD-3-Clause
**Copyright:** The Dart Authors
**Source:** https://pub.dev/packages/web_socket_channel

### socket_io_client
**License:** MIT
**Copyright:** rikulo
**Source:** https://pub.dev/packages/socket_io_client

### connectivity_plus
**License:** BSD-3-Clause
**Copyright:** Flutter Community
**Source:** https://pub.dev/packages/connectivity_plus

---

## Local Storage & Database

### hive / hive_flutter
**License:** Apache-2.0
**Copyright:** Simon Leier
**Source:** https://pub.dev/packages/hive

### sqflite
**License:** BSD-2-Clause
**Copyright:** Alexandre Roux
**Source:** https://pub.dev/packages/sqflite

### path_provider
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/path_provider

### flutter_secure_storage
**License:** BSD-3-Clause
**Copyright:** German Saprykin
**Source:** https://pub.dev/packages/flutter_secure_storage

### shared_preferences
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/shared_preferences

---

## UI Components & Design

### flutter_animate
**License:** MIT
**Copyright:** Grant Skinner / gskinner.com
**Source:** https://pub.dev/packages/flutter_animate

### shimmer
**License:** MIT
**Copyright:** Hung HD
**Source:** https://pub.dev/packages/shimmer

### cached_network_image
**License:** MIT
**Copyright:** Baseflow
**Source:** https://pub.dev/packages/cached_network_image

### flutter_slidable
**License:** MIT
**Copyright:** Romain Rastel
**Source:** https://pub.dev/packages/flutter_slidable

### flutter_svg
**License:** MIT
**Copyright:** Dan Field
**Source:** https://pub.dev/packages/flutter_svg

---

## Icons

### cupertino_icons
**License:** MIT
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/cupertino_icons

### iconsax
**License:** MIT
**Copyright:** piyushmaurya23
**Source:** https://pub.dev/packages/iconsax

---

## Charts & Visualization

### fl_chart
**License:** MIT
**Copyright:** Iman Khoshabi
**Source:** https://pub.dev/packages/fl_chart

### percent_indicator
**License:** BSD-2-Clause
**Copyright:** Diego Velásquez
**Source:** https://pub.dev/packages/percent_indicator

---

## Navigation & Routing

### go_router
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/go_router

---

## Forms & Validation

### flutter_form_builder
**License:** MIT
**Copyright:** Danvick Miller
**Source:** https://pub.dev/packages/flutter_form_builder

### form_builder_validators
**License:** BSD-3-Clause
**Copyright:** Danvick Miller
**Source:** https://pub.dev/packages/form_builder_validators

---

## Internationalization

### intl
**License:** BSD-3-Clause
**Copyright:** The Dart Authors
**Source:** https://pub.dev/packages/intl

---

## Native Features

### local_auth
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/local_auth

### geolocator
**License:** MIT
**Copyright:** Baseflow
**Source:** https://pub.dev/packages/geolocator

### permission_handler
**License:** MIT
**Copyright:** Baseflow
**Source:** https://pub.dev/packages/permission_handler

### url_launcher
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/url_launcher

### share_plus
**License:** BSD-3-Clause
**Copyright:** Flutter Community
**Source:** https://pub.dev/packages/share_plus

### device_info_plus
**License:** BSD-3-Clause
**Copyright:** Flutter Community
**Source:** https://pub.dev/packages/device_info_plus

### package_info_plus
**License:** BSD-3-Clause
**Copyright:** Flutter Community
**Source:** https://pub.dev/packages/package_info_plus

---

## Camera & Image

### image_picker
**License:** Apache-2.0
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/image_picker

### image_cropper
**License:** BSD-3-Clause
**Copyright:** HungHD
**Source:** https://pub.dev/packages/image_cropper

---

## Drawing & Canvas

### perfect_freehand
**License:** MIT
**Copyright:** Steve Ruiz
**Source:** https://pub.dev/packages/perfect_freehand

### flutter_colorpicker
**License:** MIT
**Copyright:** mchome
**Source:** https://pub.dev/packages/flutter_colorpicker

---

## Notifications

### flutter_local_notifications
**License:** BSD-3-Clause
**Copyright:** Michael Bui
**Source:** https://pub.dev/packages/flutter_local_notifications

---

## Calendar & Date

### table_calendar
**License:** Apache-2.0
**Copyright:** Aleksander Woźniak
**Source:** https://pub.dev/packages/table_calendar

### timezone
**License:** BSD-2-Clause
**Copyright:** The Dart Authors
**Source:** https://pub.dev/packages/timezone

---

## Voice & Speech

### speech_to_text
**License:** Apache-2.0
**Copyright:** Scott Finkelstein
**Source:** https://pub.dev/packages/speech_to_text

### flutter_tts
**License:** MIT
**Copyright:** dlutton
**Source:** https://pub.dev/packages/flutter_tts

### record
**License:** MIT
**Copyright:** llfbandit
**Source:** https://pub.dev/packages/record

### just_audio
**License:** MIT
**Copyright:** Ryan Heise
**Source:** https://pub.dev/packages/just_audio

### audio_session
**License:** MIT
**Copyright:** Ryan Heise
**Source:** https://pub.dev/packages/audio_session

### flutter_sound
**License:** LGPL-3.0
**Copyright:** Canardoux
**Source:** https://pub.dev/packages/flutter_sound

### flutter_webrtc
**License:** MIT
**Copyright:** cloudwebrtc
**Source:** https://pub.dev/packages/flutter_webrtc

---

## Animations & Effects

### flutter_staggered_animations
**License:** MIT
**Copyright:** mobiten
**Source:** https://pub.dev/packages/flutter_staggered_animations

### animations
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/animations

---

## Markdown

### flutter_markdown
**License:** BSD-3-Clause
**Copyright:** Flutter Authors
**Source:** https://pub.dev/packages/flutter_markdown

---

## Utilities

### uuid
**License:** MIT
**Copyright:** Yulian Kuncheff
**Source:** https://pub.dev/packages/uuid

### logger
**License:** MIT
**Copyright:** Simon Leier
**Source:** https://pub.dev/packages/logger

### equatable
**License:** MIT
**Copyright:** Felix Angelov
**Source:** https://pub.dev/packages/equatable

### dartz
**License:** MIT
**Copyright:** spebbe
**Source:** https://pub.dev/packages/dartz

### freezed_annotation
**License:** MIT
**Copyright:** Remi Rousselet
**Source:** https://pub.dev/packages/freezed_annotation

### json_annotation
**License:** BSD-3-Clause
**Copyright:** The Dart Authors
**Source:** https://pub.dev/packages/json_annotation

### timeago
**License:** MIT
**Copyright:** andresaraujo
**Source:** https://pub.dev/packages/timeago

---

## Export & Document Generation

### csv
**License:** MIT
**Copyright:** Christian Loitsch
**Source:** https://pub.dev/packages/csv

### pdf
**License:** Apache-2.0
**Copyright:** David MUSIC
**Source:** https://pub.dev/packages/pdf

---

## License Texts

### MIT License
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

### BSD-3-Clause License
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.

### Apache-2.0 License
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
`;

// Terms of Service content
const termsOfServiceContent = `# Terms of Service

**Last Updated: December 2024**

Welcome to IRIS Engage, the AI-powered CRM platform. By accessing or using our services, you agree to be bound by these Terms of Service.

## 1. Acceptance of Terms

By accessing and using the IRIS Engage mobile application and related services ("Services"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Services.

## 2. Description of Service

IRIS Engage provides an AI-powered Customer Relationship Management (CRM) platform designed to help sales professionals manage their customer relationships, track deals, and improve productivity through intelligent automation.

### Key Features
- AI-powered conversation assistant
- Contact and lead management
- Deal pipeline tracking
- Calendar and task management
- Real-time analytics and insights
- Document processing and smart capture

## 3. User Accounts

### 3.1 Registration
To access certain features of our Services, you must create an account. You agree to:
- Provide accurate and complete information
- Maintain the security of your password
- Accept responsibility for all activities under your account
- Notify us immediately of any unauthorized use

### 3.2 Account Security
You are responsible for maintaining the confidentiality of your account credentials. We recommend enabling biometric authentication when available for enhanced security.

## 4. Acceptable Use

You agree not to:
- Violate any applicable laws or regulations
- Infringe on intellectual property rights
- Transmit harmful or malicious content
- Attempt to gain unauthorized access
- Use the Services for competitive analysis
- Reverse engineer or modify the application

## 5. Data and Privacy

Your data is processed as described in our Privacy Policy. You retain ownership of all customer data you input into IRIS Engage. We process this data solely to provide our Services.

## 6. Intellectual Property

IRIS Engage, including all software, designs, and content, is protected by intellectual property laws. You may not copy, modify, or distribute any part of our Services without permission.

## 7. Disclaimers

We strive for high availability but do not guarantee uninterrupted service. AI-generated insights and recommendations are provided as guidance only.

## 8. Limitation of Liability

To the maximum extent permitted by law, IRIS Engage shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our Services.

## 9. Changes to Terms

We may update these Terms from time to time. We will notify you of material changes through the application or via email.

## 10. Contact

For questions about these Terms, please contact rosa@iriseller.com
`;

// Privacy Policy content
const privacyPolicyContent = `# Privacy Policy

**Last Updated: December 2024**

Your privacy is important to us. This Privacy Policy explains how IRIS Engage collects, uses, and protects your information.

## 1. Information We Collect

We collect information you provide directly, including account details, CRM data, and usage information.

### Account Information
- Name and email address
- Password (encrypted)
- Profile preferences

### CRM Data
- Contacts and leads
- Deals and opportunities
- Activities and notes
- Documents and attachments

### Usage Data
- App interactions
- Feature usage patterns
- Performance metrics

## 2. How We Use Your Information

We use your information to:
- Provide and improve our Services
- Personalize your experience
- Communicate with you
- Ensure security and prevent fraud
- Comply with legal obligations

## 3. AI Data Processing

Our AI features process your data to provide:
- Intelligent insights and recommendations
- Natural language understanding
- Smart data extraction
- Predictive analytics

All AI processing is performed securely with enterprise-grade encryption. Your data is NOT used to train AI models without your explicit consent.

## 4. Data Sharing

We do not sell your personal information. We may share data with:
- Service providers (hosting, analytics)
- Business partners (with your consent)
- Legal authorities (when required by law)

## 5. Data Security

We implement industry-standard security measures including:
- End-to-end encryption (TLS 1.3)
- AES-256 encryption at rest
- SOC 2 Type II certified infrastructure
- Regular security audits

## 6. Your Rights

You have the right to:
- Access your personal information
- Correct inaccurate data
- Delete your account and data
- Export your data
- Opt out of marketing communications

## 7. Data Retention

We retain your data for as long as your account is active or as needed to provide Services. You may request deletion at any time through Settings > Data & Privacy.

## 8. Contact Us

For privacy-related inquiries:
- Email: privacy@iriseller.com
- In-app: Settings > Help & Support
`;

async function seedAppContent() {
  console.log('Seeding app content...');

  const contentItems = [
    {
      type: AppContentType.OSS_LICENSES,
      title: 'Open Source Licenses',
      content: ossLicensesContent,
      version: '1.0.0',
    },
    {
      type: AppContentType.TERMS_OF_SERVICE,
      title: 'Terms of Service',
      content: termsOfServiceContent,
      version: '1.0.0',
    },
    {
      type: AppContentType.PRIVACY_SECURITY,
      title: 'Privacy Policy',
      content: privacyPolicyContent,
      version: '1.0.0',
    },
  ];

  for (const item of contentItems) {
    // Check if content already exists
    const existing = await prisma.appContent.findFirst({
      where: { type: item.type },
    });

    if (existing) {
      // Update existing
      await prisma.appContent.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          content: item.content,
          version: item.version,
          isActive: true,
        },
      });
      console.log(`Updated: ${item.type}`);
    } else {
      // Create new
      await prisma.appContent.create({
        data: {
          type: item.type,
          title: item.title,
          content: item.content,
          version: item.version,
          isActive: true,
        },
      });
      console.log(`Created: ${item.type}`);
    }
  }

  console.log('App content seeding complete!');
}

seedAppContent()
  .catch((e) => {
    console.error('Error seeding app content:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
