import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Select, Textarea, Alert, Box, Flex, Heading, Text } from '@components/ui';
import { Loader } from '@components/common/Loader';
import { useToast } from '@hooks/use-toast';

/**
 * Template Manager Component
 * Allows administrators to view and edit email notification templates
 */
const TemplateManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch available templates
  const { data: templatesData, isLoading: isLoadingTemplates, error: templatesError } = useQuery({
    queryKey: ['/api/notifications/templates'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    }
  });

  // Fetch template content when a template is selected
  const { data: templateData, isLoading: isLoadingTemplate, error: templateError } = useQuery({
    queryKey: ['/api/notifications/templates', selectedTemplate],
    queryFn: async () => {
      if (!selectedTemplate) return null;
      
      const response = await fetch(`/api/notifications/templates/${selectedTemplate}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${selectedTemplate}`);
      }
      return response.json();
    },
    enabled: !!selectedTemplate
  });

  // Update template content when templateData changes
  useEffect(() => {
    if (templateData?.success && templateData?.template) {
      setTemplateContent(templateData.template.content);
    }
  }, [templateData]);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/templates/${selectedTemplate}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: templateContent })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/templates', selectedTemplate] });
      toast({
        title: 'Success',
        description: 'Template saved successfully',
        variant: 'success'
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive'
      });
    }
  });

  // Reset template mutation
  const resetTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/templates/${selectedTemplate}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/templates', selectedTemplate] });
      toast({
        title: 'Success',
        description: 'Template reset to default',
        variant: 'success'
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset template',
        variant: 'destructive'
      });
    }
  });

  // Handle template selection
  const handleTemplateChange = (value) => {
    setSelectedTemplate(value);
    setIsEditing(false);
  };

  // Handle save action
  const handleSave = () => {
    saveTemplateMutation.mutate();
  };

  // Handle reset action
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset this template to the default? This will delete any customizations.')) {
      resetTemplateMutation.mutate();
    }
  };

  // Handle content change
  const handleContentChange = (e) => {
    setTemplateContent(e.target.value);
  };

  // Helper to display a descriptive name for the template
  const getTemplateName = (key) => {
    const names = {
      'leave_request_created': 'Leave Request Created (Manager Notification)',
      'leave_request_created_confirmation': 'Leave Request Created (Employee Confirmation)',
      'leave_request_approved': 'Leave Request Approved',
      'leave_request_denied': 'Leave Request Denied',
      'leave_request_cancelled': 'Leave Request Cancelled',
      'time_entry_reminder': 'Time Entry Reminder',
      'time_entry_approved': 'Time Entry Approved',
      'monthly_report': 'Monthly Time Report',
      'password_reset': 'Password Reset',
      'account_created': 'Account Created'
    };
    
    return names[key] || key;
  };

  // Show loading state
  if (isLoadingTemplates) {
    return <Loader label="Loading templates..." />;
  }

  // Show error state
  if (templatesError) {
    return (
      <Alert variant="destructive">
        <div>Error loading templates: {templatesError.message}</div>
      </Alert>
    );
  }

  return (
    <Box className="space-y-6">
      <Heading as="h2" size="lg">Email Template Manager</Heading>
      <Text>
        Customize email notification templates for various HR workflows. Select a template to view or edit.
      </Text>

      <Box className="space-y-4">
        <Select
          label="Select Template"
          value={selectedTemplate}
          onChange={handleTemplateChange}
          options={templatesData?.templates?.map(template => ({
            value: template,
            label: getTemplateName(template)
          }))}
          placeholder="Choose a template..."
        />

        {selectedTemplate && (
          <Box className="space-y-4 border p-4 rounded-md">
            <Flex justify="between" align="center">
              <Heading as="h3" size="sm">{getTemplateName(selectedTemplate)}</Heading>
              <Flex gap="2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} isLoading={saveTemplateMutation.isPending}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Template
                    </Button>
                    <Button variant="outline" onClick={handleReset} isLoading={resetTemplateMutation.isPending}>
                      Reset to Default
                    </Button>
                  </>
                )}
              </Flex>
            </Flex>

            {isLoadingTemplate ? (
              <Loader label="Loading template content..." />
            ) : templateError ? (
              <Alert variant="destructive">
                <div>Error loading template: {templateError.message}</div>
              </Alert>
            ) : (
              <>
                <Text size="sm" className="text-gray-500">
                  This template supports the following variables: 
                  {selectedTemplate.includes('leave_request') && (
                    <span>employee (name, email, department), manager (name, email), leaveRequest (type, startDate, endDate, notes, status)</span>
                  )}
                  {selectedTemplate.includes('time_entry') && (
                    <span>employee (name, email, department), timeEntry (date, startTime, endTime, breakDuration, project, notes)</span>
                  )}
                  {selectedTemplate === 'monthly_report' && (
                    <span>employee (name, email, department), month, year, report (totalDays, workingDays, totalHours, overtimeHours)</span>
                  )}
                  {selectedTemplate.includes('password_reset') && (
                    <span>user (name, email), resetToken, resetUrl</span>
                  )}
                  {selectedTemplate === 'account_created' && (
                    <span>user (name, email), initialPassword, loginUrl</span>
                  )}
                </Text>

                <Textarea
                  label="Template HTML"
                  value={templateContent}
                  onChange={handleContentChange}
                  disabled={!isEditing}
                  rows={20}
                  className="font-mono text-sm"
                />
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TemplateManager;