import { Box, Button, Group, Modal, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconBulb, IconSend } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { createFeedback, FeedbackApiError } from '../../lib/feedback/api';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_IDS,
  type FeedbackCategory,
} from '../../lib/feedback/config';
import { TurnstileWidget } from './Turnstile';

interface Props {
  opened: boolean;
  onClose: () => void;
  siteKey: string;
}

interface FormValues {
  title: string;
  description: string;
  displayName: string;
  category: FeedbackCategory;
  turnstileToken: string;
}

export function SubmitFeedbackModal({ opened, onClose, siteKey }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      description: '',
      displayName: '',
      category: 'feature',
      turnstileToken: '',
    },
    validate: {
      title: (value) => (value.trim().length < 5 ? 'Use at least 5 characters.' : null),
      description: (value) => (value.trim().length < 20 ? 'Use at least 20 characters.' : null),
      turnstileToken: (value) => (!value ? 'Complete the verification.' : null),
    },
  });
  const setTurnstileToken = useCallback(
    (token: string | undefined) => form.setFieldValue('turnstileToken', token ?? ''),
    [form],
  );

  const submit = form.onSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await createFeedback(values);
      notifications.show({
        color: 'green',
        title: 'Feedback submitted',
        message: 'Your suggestion is now under review.',
      });
      window.location.assign(result.url);
    } catch (error) {
      if (error instanceof FeedbackApiError && error.fieldErrors) {
        form.setErrors(
          Object.fromEntries(
            Object.entries(error.fieldErrors).map(([field, messages]) => [field, messages[0]]),
          ),
        );
      }
      notifications.show({
        color: 'red',
        title: 'Could not submit feedback',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
      form.setFieldValue('turnstileToken', '');
      setTurnstileResetKey((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Suggest an improvement"
      size="lg"
      centered
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
    >
      <Box component="form" onSubmit={submit}>
        <Stack>
          <Text size="sm" c="dimmed">
            Share one clear problem or idea. Similar requests can be merged by the team in GitHub.
          </Text>
          <TextInput
            label="Title"
            placeholder="What should Excalimate improve?"
            maxLength={120}
            required
            leftSection={<IconBulb size={17} />}
            {...form.getInputProps('title')}
          />
          <Select
            label="Category"
            data={FEEDBACK_CATEGORY_IDS.map((id) => ({
              value: id,
              label: FEEDBACK_CATEGORIES[id].label,
            }))}
            allowDeselect={false}
            required
            {...form.getInputProps('category')}
          />
          <Textarea
            label="Description"
            description="Explain the problem, desired outcome, and why it matters."
            placeholder="Today I have to... It would be better if..."
            autosize
            minRows={5}
            maxRows={10}
            maxLength={5000}
            required
            {...form.getInputProps('description')}
          />
          <TextInput
            label="Display name"
            description="Optional and public. Leave blank to post as Anonymous."
            placeholder="Anonymous"
            maxLength={60}
            {...form.getInputProps('displayName')}
          />
          <TurnstileWidget
            siteKey={siteKey}
            action="submit_feedback"
            resetKey={turnstileResetKey}
            onToken={setTurnstileToken}
          />
          {form.errors.turnstileToken && (
            <Text c="red" size="sm" role="alert">
              {form.errors.turnstileToken}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} leftSection={<IconSend size={17} />}>
              Submit feedback
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
