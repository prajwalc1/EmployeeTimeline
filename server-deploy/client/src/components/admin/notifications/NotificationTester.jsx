import React, { useState } from 'react';
import { Button, Input, Select, Alert, Box, Flex, Heading, Text, Card, Separator } from '@components/ui';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@hooks/use-toast';

/**
 * Notification Tester Component
 * Allows administrators to test notification templates with real data
 */
const NotificationTester = () => {
  const { toast } = useToast();
  const [selectedDemo, setSelectedDemo] = useState('');
  const [testData, setTestData] = useState({
    employeeEmail: '',
    employeeName: 'Test Employee',
    managerEmail: '',
    managerName: 'Test Manager',
    department: 'IT',
    type: 'VACATION',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    notes: 'This is a test notification'
  });

  // Calculate end date one week from start date
  const calculateEndDate = (startDate) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  };

  // Update testData when startDate changes
  React.useEffect(() => {
    if (testData.startDate && !testData.endDate) {
      setTestData(prev => ({
        ...prev,
        endDate: calculateEndDate(prev.startDate)
      }));
    }
  }, [testData.startDate]);

  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      // Ensure we have necessary data
      if (!testData.employeeEmail) {
        throw new Error('Employee email is required');
      }
      
      if (selectedDemo.includes('leave-request') && !testData.managerEmail) {
        throw new Error('Manager email is required for leave request notifications');
      }

      const response = await fetch(`/api/notifications/demo/${selectedDemo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send test notification');
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message || 'Test notification sent successfully',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive'
      });
    }
  });

  // Handle input change
  const handleInputChange = (field, value) => {
    setTestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle demo selection
  const handleDemoChange = (value) => {
    setSelectedDemo(value);
  };

  // Handle send test
  const handleSendTest = () => {
    testNotificationMutation.mutate();
  };

  // Get available demos
  const demoOptions = [
    { value: 'leave-request-created', label: 'Leave Request Created' },
    { value: 'leave-request-approved', label: 'Leave Request Approved' },
    { value: 'time-entry-reminder', label: 'Time Entry Reminder' },
    { value: 'monthly-report', label: 'Monthly Report' }
  ];

  return (
    <Box className="space-y-6">
      <Heading as="h2" size="lg">Test Notification Templates</Heading>
      <Text>
        Send test notifications to verify template formatting and content.
      </Text>

      <Card>
        <div className="p-6">
          <Box className="space-y-4">
            <Select
              label="Select Notification Type"
              value={selectedDemo}
              onChange={handleDemoChange}
              options={demoOptions}
              placeholder="Choose a notification to test..."
            />

            {selectedDemo && (
              <Box className="space-y-4 border p-4 rounded-md">
                <Heading as="h3" size="sm">Test Data</Heading>

                <Text size="sm" className="text-gray-500">
                  Enter real email addresses to receive the test notification.
                </Text>

                <Separator className="my-4" />

                <Heading as="h4" size="xs">Recipient Information</Heading>
                <Flex gap="4">
                  <Input
                    label="Employee Email *"
                    value={testData.employeeEmail}
                    onChange={(e) => handleInputChange('employeeEmail', e.target.value)}
                    placeholder="employee@example.com"
                    required
                  />
                  
                  <Input
                    label="Employee Name"
                    value={testData.employeeName}
                    onChange={(e) => handleInputChange('employeeName', e.target.value)}
                    placeholder="John Doe"
                  />
                </Flex>

                {selectedDemo.includes('leave-request') && (
                  <Flex gap="4">
                    <Input
                      label="Manager Email *"
                      value={testData.managerEmail}
                      onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                      placeholder="manager@example.com"
                      required
                    />
                    
                    <Input
                      label="Manager Name"
                      value={testData.managerName}
                      onChange={(e) => handleInputChange('managerName', e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </Flex>
                )}

                <Input
                  label="Department"
                  value={testData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="IT"
                />

                <Separator className="my-4" />

                {(selectedDemo.includes('leave-request')) && (
                  <>
                    <Heading as="h4" size="xs">Leave Request Details</Heading>
                    <Select
                      label="Leave Type"
                      value={testData.type}
                      onChange={(value) => handleInputChange('type', value)}
                      options={[
                        { value: 'VACATION', label: 'Vacation' },
                        { value: 'SICK', label: 'Sick Leave' },
                        { value: 'PERSONAL', label: 'Personal Leave' },
                        { value: 'PARENTAL', label: 'Parental Leave' }
                      ]}
                    />
                    
                    <Flex gap="4">
                      <Input
                        label="Start Date"
                        value={testData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        type="date"
                      />
                      
                      <Input
                        label="End Date"
                        value={testData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        type="date"
                      />
                    </Flex>
                    
                    <Input
                      label="Notes"
                      value={testData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Reason for leave"
                    />
                  </>
                )}

                {selectedDemo === 'time-entry-reminder' && (
                  <>
                    <Heading as="h4" size="xs">Missing Time Entries</Heading>
                    <Flex gap="4">
                      <Input
                        label="Date 1"
                        value={testData.date1 || ''}
                        onChange={(e) => handleInputChange('date1', e.target.value)}
                        type="date"
                      />
                      
                      <Input
                        label="Date 2"
                        value={testData.date2 || ''}
                        onChange={(e) => handleInputChange('date2', e.target.value)}
                        type="date"
                      />
                    </Flex>
                  </>
                )}

                {selectedDemo === 'monthly-report' && (
                  <>
                    <Heading as="h4" size="xs">Report Period</Heading>
                    <Flex gap="4">
                      <Input
                        label="Month"
                        value={testData.month || new Date().getMonth() + 1}
                        onChange={(e) => handleInputChange('month', parseInt(e.target.value))}
                        type="number"
                        min="1"
                        max="12"
                      />
                      
                      <Input
                        label="Year"
                        value={testData.year || new Date().getFullYear()}
                        onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                        type="number"
                        min="2000"
                        max="2100"
                      />
                    </Flex>
                  </>
                )}

                <Flex justify="end">
                  <Button
                    onClick={handleSendTest}
                    isLoading={testNotificationMutation.isPending}
                    disabled={!selectedDemo || !testData.employeeEmail || (selectedDemo.includes('leave-request') && !testData.managerEmail)}
                  >
                    Send Test Notification
                  </Button>
                </Flex>
              </Box>
            )}
          </Box>
        </div>
      </Card>

      <Alert variant="info">
        <div>
          <strong>Note:</strong> Test notifications will be sent to real email addresses. Make sure you have properly configured the email settings.
        </div>
      </Alert>
    </Box>
  );
};

export default NotificationTester;