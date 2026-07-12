import { Anchor, Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconMessageCircle, IconThumbUp } from '@tabler/icons-react';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  isTerminalStatus,
} from '../../lib/feedback/config';
import type { FeedbackSummary } from '../../lib/feedback/types';

interface Props {
  item: FeedbackSummary;
  voting: boolean;
  onVote: (item: FeedbackSummary) => void;
}

const statusColors = {
  'under-review': 'gray',
  planned: 'violet',
  'in-progress': 'yellow',
  completed: 'green',
  rejected: 'red',
} as const;

export function FeedbackCard({ item, voting, onVote }: Props) {
  const terminal = isTerminalStatus(item.status);
  return (
    <Paper className="feedback-card" withBorder>
      <Group align="flex-start" wrap="nowrap" gap="md">
        <Button
          className="feedback-vote"
          variant={item.voteCount > 0 ? 'light' : 'default'}
          leftSection={<IconThumbUp size={17} />}
          loading={voting}
          disabled={terminal}
          aria-label={`${item.voteCount} votes for ${item.title}`}
          onClick={() => onVote(item)}
        >
          {item.voteCount}
        </Button>
        <Stack gap={8} className="feedback-card-content">
          <Group gap={8}>
            <Badge color={statusColors[item.status]} variant="light">
              {FEEDBACK_STATUSES[item.status].label}
            </Badge>
            <Badge color="dark" variant="outline">
              {FEEDBACK_CATEGORIES[item.category].label}
            </Badge>
          </Group>
          <Anchor href={`/feedback/${item.number}`} underline="never">
            <Title order={2} className="feedback-card-title">
              {item.title}
            </Title>
          </Anchor>
          <Text c="dimmed" lineClamp={2}>
            {item.excerpt}
          </Text>
          <Group gap="lg" className="feedback-card-meta">
            <Text size="sm">
              #{item.number} by {item.authorName}
            </Text>
            <Group gap={5}>
              <IconMessageCircle size={16} />
              <Text size="sm">{item.commentCount}</Text>
            </Group>
            <Text size="sm">
              {new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }).format(new Date(item.createdAt))}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
