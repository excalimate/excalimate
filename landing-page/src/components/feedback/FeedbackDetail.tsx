import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBrandGithub,
  IconMessageCircle,
  IconSend,
  IconThumbUp,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addFeedbackComment,
  FeedbackApiError,
  getFeedback,
  setFeedbackVote,
} from '../../lib/feedback/api';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  isTerminalStatus,
} from '../../lib/feedback/config';
import type { FeedbackDetail as FeedbackDetailType } from '../../lib/feedback/types';
import { FeedbackProvider } from './FeedbackProvider';
import { TurnstileAction, type TurnstileActionHandle, TurnstileWidget } from './Turnstile';

interface Props {
  number: number;
  initialItem?: FeedbackDetailType;
}

interface CommentForm {
  body: string;
  displayName: string;
  turnstileToken: string;
}

const statusColors = {
  'under-review': 'gray',
  planned: 'violet',
  'in-progress': 'yellow',
  completed: 'green',
  rejected: 'red',
} as const;

function FeedbackDetailContent({ number, initialItem }: Props) {
  const [item, setItem] = useState(initialItem);
  const [siteKey, setSiteKey] = useState('');
  const [loading, setLoading] = useState(!initialItem);
  const [error, setError] = useState<string>();
  const [voting, setVoting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const voteChallengeRef = useRef<TurnstileActionHandle>(null);
  const commentForm = useForm<CommentForm>({
    initialValues: { body: '', displayName: '', turnstileToken: '' },
    validate: {
      body: (value) => (value.trim().length < 2 ? 'Write at least 2 characters.' : null),
      turnstileToken: (value) => (!value ? 'Complete the verification.' : null),
    },
  });
  const setCommentToken = useCallback(
    (token: string | undefined) => commentForm.setFieldValue('turnstileToken', token ?? ''),
    [commentForm],
  );

  useEffect(() => {
    const controller = new AbortController();
    void getFeedback(number, controller.signal)
      .then((response) => {
        setItem(response.item);
        setSiteKey(response.turnstileSiteKey);
        setError(undefined);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error ? requestError.message : 'Feedback could not be loaded.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [number]);

  const vote = async () => {
    if (!item || !siteKey || !voteChallengeRef.current) return;
    setVoting(true);
    try {
      const token = await voteChallengeRef.current.execute();
      const result = await setFeedbackVote(number, !item.viewerHasVoted, token);
      setItem((current) =>
        current
          ? {
              ...current,
              voteCount: result.voteCount,
              viewerHasVoted: result.viewerHasVoted,
            }
          : current,
      );
      notifications.show({
        color: result.viewerHasVoted ? 'green' : 'gray',
        title: result.viewerHasVoted ? 'Vote recorded' : 'Vote removed',
        message: result.viewerHasVoted
          ? 'Thanks for helping prioritize this request.'
          : 'Your vote has been removed.',
      });
    } catch (voteError) {
      notifications.show({
        color: 'red',
        title: 'Could not update vote',
        message: voteError instanceof Error ? voteError.message : 'Please try again.',
      });
    } finally {
      setVoting(false);
    }
  };

  const submitComment = commentForm.onSubmit(async (values) => {
    setCommenting(true);
    try {
      const result = await addFeedbackComment(number, values);
      setItem((current) =>
        current
          ? {
              ...current,
              comments: result.comments,
              commentCount: result.comments.length,
            }
          : current,
      );
      commentForm.setValues({ body: '', displayName: '', turnstileToken: '' });
      setTurnstileResetKey((value) => value + 1);
      notifications.show({
        color: 'green',
        title: 'Comment added',
        message: 'Your comment is now part of the discussion.',
      });
    } catch (commentError) {
      if (commentError instanceof FeedbackApiError && commentError.fieldErrors) {
        commentForm.setErrors(
          Object.fromEntries(
            Object.entries(commentError.fieldErrors).map(([field, messages]) => [
              field,
              messages[0],
            ]),
          ),
        );
      }
      notifications.show({
        color: 'red',
        title: 'Could not add comment',
        message: commentError instanceof Error ? commentError.message : 'Please try again.',
      });
      commentForm.setFieldValue('turnstileToken', '');
      setTurnstileResetKey((value) => value + 1);
    } finally {
      setCommenting(false);
    }
  });

  if (loading && !item) {
    return (
      <Container size="md" className="feedback-shell">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    );
  }

  if (!item) {
    return (
      <Container size="md" className="feedback-shell">
        <Alert
          color="red"
          title="Feedback could not be loaded"
          icon={<IconAlertCircle size={18} />}
        >
          {error || 'This feedback item does not exist.'}
        </Alert>
      </Container>
    );
  }

  const terminal = isTerminalStatus(item.status);
  return (
    <Container size="md" className="feedback-shell">
      <Stack gap="xl">
        <Anchor href="/feedback" className="feedback-back">
          <Group gap={6}>
            <IconArrowLeft size={17} />
            <Text size="sm" fw={600}>
              Back to feedback
            </Text>
          </Group>
        </Anchor>

        {error && (
          <Alert color="yellow" title="Could not refresh feedback">
            Showing the latest available version. {error}
          </Alert>
        )}

        <Paper className="feedback-detail-card" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <Group gap={8}>
                <Badge
                  className="feedback-status-badge"
                  color={statusColors[item.status]}
                  variant="light"
                >
                  {FEEDBACK_STATUSES[item.status].label}
                </Badge>
                <Badge color="dark" variant="outline">
                  {FEEDBACK_CATEGORIES[item.category].label}
                </Badge>
              </Group>
              <ActionIcon
                component="a"
                href={item.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open this feedback issue on GitHub"
                className="feedback-github-link"
                variant="default"
                size={44}
              >
                <IconBrandGithub size={24} />
              </ActionIcon>
            </Group>
            <Title order={1}>{item.title}</Title>
            <Text className="feedback-body">{item.body}</Text>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                #{item.number} submitted by {item.authorName}
              </Text>
              <Button
                variant={item.viewerHasVoted ? 'filled' : 'default'}
                leftSection={<IconThumbUp size={18} />}
                loading={voting}
                disabled={terminal || !siteKey}
                onClick={vote}
              >
                {item.viewerHasVoted ? 'Supported' : 'Support'} · {item.voteCount}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {terminal && (
          <Alert color={item.status === 'completed' ? 'green' : 'red'}>
            This item is {FEEDBACK_STATUSES[item.status].label.toLowerCase()} and is now read-only.
          </Alert>
        )}

        <Stack gap="md">
          <Group gap={8}>
            <IconMessageCircle size={21} />
            <Title order={2}>Discussion ({item.commentCount})</Title>
          </Group>
          {item.comments.length ? (
            item.comments.map((comment) => (
              <Paper key={comment.id} className="feedback-comment" withBorder>
                <Group align="flex-start" wrap="nowrap">
                  <Avatar
                    src={comment.authorAvatarUrl}
                    name={comment.authorName}
                    color={comment.isDeveloper ? 'violet' : 'yellow'}
                    radius="xl"
                  />
                  <Stack gap={6} className="feedback-comment-content">
                    <Group gap={8}>
                      {comment.authorUrl ? (
                        <Anchor
                          href={comment.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          fw={700}
                        >
                          {comment.authorName}
                        </Anchor>
                      ) : (
                        <Text fw={700}>{comment.authorName}</Text>
                      )}
                      {comment.isDeveloper && (
                        <Badge color="violet" size="sm">
                          Excalimate team
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }).format(new Date(comment.createdAt))}
                      </Text>
                    </Group>
                    <Text className="feedback-body">{comment.body}</Text>
                  </Stack>
                </Group>
              </Paper>
            ))
          ) : (
            <Text c="dimmed">No comments yet. Start the discussion.</Text>
          )}
        </Stack>

        {!terminal && (
          <Paper className="feedback-comment-form" withBorder>
            <Box component="form" onSubmit={submitComment}>
              <Stack>
                <Title order={3}>Add to the discussion</Title>
                <Textarea
                  label="Comment"
                  placeholder="Share context, a use case, or a question"
                  autosize
                  minRows={4}
                  maxRows={8}
                  maxLength={2000}
                  required
                  {...commentForm.getInputProps('body')}
                />
                <TextInput
                  label="Display name"
                  description="Optional and public. Leave blank to post as Anonymous."
                  placeholder="Anonymous"
                  maxLength={60}
                  {...commentForm.getInputProps('displayName')}
                />
                <TurnstileWidget
                  siteKey={siteKey}
                  action="comment_feedback"
                  resetKey={turnstileResetKey}
                  onToken={setCommentToken}
                />
                {commentForm.errors.turnstileToken && (
                  <Text c="red" size="sm" role="alert">
                    {commentForm.errors.turnstileToken}
                  </Text>
                )}
                <Group justify="flex-end">
                  <Button
                    type="submit"
                    loading={commenting}
                    disabled={!siteKey}
                    leftSection={<IconSend size={17} />}
                  >
                    Post comment
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Paper>
        )}
      </Stack>
      <TurnstileAction ref={voteChallengeRef} siteKey={siteKey} action="vote_feedback" />
    </Container>
  );
}

export default function FeedbackDetail(props: Props) {
  return (
    <FeedbackProvider>
      <FeedbackDetailContent {...props} />
    </FeedbackProvider>
  );
}
