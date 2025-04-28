import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, Switch, Alert, Box, Flex, Heading, Text, Card } from '@components/ui';
import { Loader } from '@components/common/Loader';
import { useToast } from '@hooks/use-toast';

/**
 * Email Settings Component
 * Allows administrators to configure email notification settings
 */
const EmailSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(null);
  const [testEmail, setTestEmail] = useState('');

  // Fetch current settings
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/notifications/settings'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.settings && !settings) {
        setSettings(data.settings);
      }
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings) => {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/settings'] });
      toast({
        title: 'Success',
        description: 'Email settings updated successfully',
        variant: 'success'
      });
      
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive'
      });
    }
  });

  // Test email configuration mutation
  const testEmailMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send test email');
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Test email sent successfully',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email',
        variant: 'destructive'
      });
    }
  });

  // Handle input change
  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Handle save
  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  // Handle test email
  const handleTestEmail = () => {
    if (!testEmail) {
      toast({
        title: 'Warning',
        description: 'Please enter a valid email address',
        variant: 'warning'
      });
      return;
    }
    testEmailMutation.mutate(testEmail);
  };

  // Show loading state
  if (isLoading) {
    return <Loader label="Loading email settings..." />;
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <div>Error loading email settings: {error.message}</div>
      </Alert>
    );
  }

  // If settings not yet set
  if (!settings) {
    return <Loader label="Preparing settings form..." />;
  }

  return (
    <Box className="space-y-6">
      <Heading as="h2" size="lg">Email Notification Settings</Heading>
      <Text>
        Configure how email notifications are sent and customize global notification settings.
      </Text>

      <Card>
        <div className="p-6">
          <Heading as="h3" size="md" className="mb-4">Email Provider</Heading>
          
          <Box className="space-y-4">
            <Select
              label="Email Provider"
              value={settings.email.emailProvider}
              onChange={(value) => handleInputChange('email', 'emailProvider', value)}
              options={[
                { value: 'smtp', label: 'SMTP Server' },
                { value: 'sendmail', label: 'Server Sendmail' },
                { value: 'preview', label: 'Preview Mode (Development)' }
              ]}
            />

            {settings.email.emailProvider === 'smtp' && (
              <Box className="space-y-4 border p-4 rounded-md">
                <Heading as="h4" size="sm">SMTP Configuration</Heading>
                
                <Flex gap="4">
                  <Input
                    label="SMTP Host"
                    value={settings.email.smtpHost}
                    onChange={(e) => handleInputChange('email', 'smtpHost', e.target.value)}
                    placeholder="smtp.example.com"
                  />
                  
                  <Input
                    label="SMTP Port"
                    value={settings.email.smtpPort}
                    onChange={(e) => handleInputChange('email', 'smtpPort', parseInt(e.target.value) || '')}
                    placeholder="587"
                    type="number"
                  />
                </Flex>
                
                <Switch
                  label="Use Secure Connection (SSL/TLS)"
                  checked={settings.email.smtpSecure}
                  onCheckedChange={(checked) => handleInputChange('email', 'smtpSecure', checked)}
                />
                
                <Flex gap="4">
                  <Input
                    label="SMTP Username"
                    value={settings.email.smtpUser}
                    onChange={(e) => handleInputChange('email', 'smtpUser', e.target.value)}
                    placeholder="username@example.com"
                  />
                  
                  <Input
                    label="SMTP Password"
                    value={settings.email.smtpPassword}
                    onChange={(e) => handleInputChange('email', 'smtpPassword', e.target.value)}
                    type="password"
                    placeholder="••••••••••"
                  />
                </Flex>
              </Box>
            )}

            <Box className="space-y-4">
              <Heading as="h4" size="sm">Email Identity</Heading>
              
              <Flex gap="4">
                <Input
                  label="From Email Address"
                  value={settings.email.emailFrom}
                  onChange={(e) => handleInputChange('email', 'emailFrom', e.target.value)}
                  placeholder="notifications@example.com"
                />
                
                <Input
                  label="From Name"
                  value={settings.email.emailFromName}
                  onChange={(e) => handleInputChange('email', 'emailFromName', e.target.value)}
                  placeholder="Time Management System"
                />
              </Flex>
            </Box>

            <Box className="space-y-4">
              <Heading as="h4" size="sm">Admin Notifications</Heading>
              
              <Switch
                label="BCC Admin on All Notifications"
                checked={settings.email.bccAdmin}
                onCheckedChange={(checked) => handleInputChange('email', 'bccAdmin', checked)}
              />
              
              {settings.email.bccAdmin && (
                <Input
                  label="Admin Email Address"
                  value={settings.email.adminEmail}
                  onChange={(e) => handleInputChange('email', 'adminEmail', e.target.value)}
                  placeholder="admin@example.com"
                />
              )}
            </Box>
          </Box>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <Heading as="h3" size="md" className="mb-4">Notification Settings</Heading>
          
          <Box className="space-y-4">
            <Switch
              label="Enable Email Notifications"
              checked={settings.notifications.enableNotifications}
              onCheckedChange={(checked) => handleInputChange('notifications', 'enableNotifications', checked)}
            />
            
            <Heading as="h4" size="sm">Notification Types</Heading>
            
            <Switch
              label="Leave Request Notifications"
              checked={settings.notifications.notificationTypes.leaveRequest}
              onCheckedChange={(checked) => handleInputChange('notifications', 'notificationTypes', {
                ...settings.notifications.notificationTypes,
                leaveRequest: checked
              })}
            />
            
            <Switch
              label="Time Entry Notifications"
              checked={settings.notifications.notificationTypes.timeEntry}
              onCheckedChange={(checked) => handleInputChange('notifications', 'notificationTypes', {
                ...settings.notifications.notificationTypes,
                timeEntry: checked
              })}
            />
            
            <Switch
              label="Monthly Report Notifications"
              checked={settings.notifications.notificationTypes.monthlyReport}
              onCheckedChange={(checked) => handleInputChange('notifications', 'notificationTypes', {
                ...settings.notifications.notificationTypes,
                monthlyReport: checked
              })}
            />
            
            <Switch
              label="System Notifications"
              checked={settings.notifications.notificationTypes.systemNotice}
              onCheckedChange={(checked) => handleInputChange('notifications', 'notificationTypes', {
                ...settings.notifications.notificationTypes,
                systemNotice: checked
              })}
            />
          </Box>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <Heading as="h3" size="md" className="mb-4">Test Email Configuration</Heading>
          
          <Box className="space-y-4">
            <Text>
              Send a test email to verify your configuration is working correctly.
            </Text>
            
            <Flex gap="4" align="end">
              <Input
                label="Test Email Address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
              
              <Button 
                onClick={handleTestEmail} 
                isLoading={testEmailMutation.isPending}
                disabled={!settings.email.emailProvider || !testEmail}
              >
                Send Test Email
              </Button>
            </Flex>
          </Box>
        </div>
      </Card>

      <Flex justify="end" gap="2">
        <Button
          onClick={handleSave}
          isLoading={updateSettingsMutation.isPending}
          disabled={!settings}
        >
          Save Settings
        </Button>
      </Flex>
    </Box>
  );
};

export default EmailSettings;