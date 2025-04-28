import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs';
import { Box, Heading, Text } from '@components/ui';
import TemplateManager from './TemplateManager';
import EmailSettings from './EmailSettings';
import NotificationTester from './NotificationTester';

/**
 * Notifications Admin Component
 * Main admin interface for managing notification settings and templates
 */
const NotificationsAdmin = () => {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <Box className="container mx-auto py-6">
      <Box className="mb-6">
        <Heading as="h1" size="xl">Email Notification Management</Heading>
        <Text className="text-gray-600 mt-2">
          Manage email templates and notification settings for HR workflows
        </Text>
      </Box>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="settings">Email Settings</TabsTrigger>
          <TabsTrigger value="test">Test Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>
        
        <TabsContent value="settings">
          <EmailSettings />
        </TabsContent>
        
        <TabsContent value="test">
          <NotificationTester />
        </TabsContent>
      </Tabs>
    </Box>
  );
};

export default NotificationsAdmin;