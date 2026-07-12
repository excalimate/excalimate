import {
  Alert,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconMessagePlus, IconSearch, IconSparkles } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearFeedbackListStale,
  FeedbackApiError,
  isFeedbackListStale,
  listFeedback,
  setFeedbackVote,
  type FeedbackListQuery,
} from '../../lib/feedback/api';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_IDS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_IDS,
} from '../../lib/feedback/config';
import type { FeedbackListResponse, FeedbackSummary } from '../../lib/feedback/types';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackProvider } from './FeedbackProvider';
import { SubmitFeedbackModal } from './SubmitFeedbackModal';
import { TurnstileAction, type TurnstileActionHandle } from './Turnstile';

function initialQuery(): FeedbackListQuery {
  if (typeof window === 'undefined') {
    return { search: '', category: 'all', status: 'all', sort: 'top', page: 1 };
  }
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category') ?? 'all';
  const status = params.get('status') ?? 'all';
  const sort = params.get('sort') ?? 'top';
  const page = Number(params.get('page') || 1);
  return {
    search: params.get('search') ?? '',
    category:
      category === 'all' ||
      FEEDBACK_CATEGORY_IDS.includes(category as (typeof FEEDBACK_CATEGORY_IDS)[number])
        ? category
        : 'all',
    status:
      status === 'all' ||
      FEEDBACK_STATUS_IDS.includes(status as (typeof FEEDBACK_STATUS_IDS)[number])
        ? status
        : 'all',
    sort: sort === 'newest' ? 'newest' : 'top',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

function FeedbackBoardContent() {
  const [query, setQuery] = useState<FeedbackListQuery>(initialQuery);
  const [debouncedSearch] = useDebouncedValue(query.search, 300);
  const [data, setData] = useState<FeedbackListResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [votingNumber, setVotingNumber] = useState<number>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [submitOpened, submitControls] = useDisclosure(false);
  const voteChallengeRef = useRef<TurnstileActionHandle>(null);
  const freshRequestRef = useRef(isFeedbackListStale());

  useEffect(() => {
    const controller = new AbortController();
    const fresh = freshRequestRef.current || isFeedbackListStale();
    const effectiveQuery: FeedbackListQuery = {
      search: debouncedSearch,
      category: query.category,
      status: query.status,
      sort: query.sort,
      page: query.page,
    };
    void listFeedback(effectiveQuery, { signal: controller.signal, fresh })
      .then((result) => {
        setData(result);
        setError(undefined);
        if (fresh) {
          freshRequestRef.current = false;
          clearFeedbackListStale();
        }
        if (result.page !== query.page) {
          setQuery((current) => ({ ...current, page: result.page }));
        }
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
  }, [debouncedSearch, query.category, query.page, query.sort, query.status, refreshVersion]);

  useEffect(() => {
    const refreshRestoredPage = (event: PageTransitionEvent) => {
      if (!event.persisted && !isFeedbackListStale()) return;
      freshRequestRef.current = true;
      submitControls.close();
      setRefreshVersion((version) => version + 1);
    };
    window.addEventListener('pageshow', refreshRestoredPage);
    return () => window.removeEventListener('pageshow', refreshRestoredPage);
  }, [submitControls.close]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (query.category !== 'all') params.set('category', query.category);
    if (query.status !== 'all') params.set('status', query.status);
    if (query.sort !== 'top') params.set('sort', query.sort);
    if (query.page !== 1) params.set('page', String(query.page));
    const suffix = params.size ? `?${params}` : window.location.pathname;
    window.history.replaceState(null, '', suffix);
  }, [debouncedSearch, query.category, query.page, query.sort, query.status]);

  const updateQuery = (values: Partial<FeedbackListQuery>) =>
    setQuery((current) => ({ ...current, ...values, page: values.page ?? 1 }));

  const openSubmittedFeedback = useCallback(
    (url: string) => {
      submitControls.close();
      window.location.assign(url);
    },
    [submitControls.close],
  );

  const vote = async (item: FeedbackSummary) => {
    if (!data?.turnstileSiteKey || !voteChallengeRef.current) return;
    setVotingNumber(item.number);
    try {
      const token = await voteChallengeRef.current.execute();
      const result = await setFeedbackVote(item.number, true, token);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((candidate) =>
                candidate.number === item.number
                  ? { ...candidate, voteCount: result.voteCount }
                  : candidate,
              ),
            }
          : current,
      );
      notifications.show({
        color: 'green',
        title: 'Vote recorded',
        message: 'Thanks for helping the team prioritize.',
      });
    } catch (voteError) {
      notifications.show({
        color: 'red',
        title: 'Could not record vote',
        message:
          voteError instanceof FeedbackApiError || voteError instanceof Error
            ? voteError.message
            : 'Please try again.',
      });
    } finally {
      setVotingNumber(undefined);
    }
  };

  return (
    <Container size="lg" className="feedback-shell">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Stack gap={8} className="feedback-heading">
            <Group gap={8}>
              <IconSparkles size={20} />
              <Text fw={700} size="sm">
                Built in public
              </Text>
            </Group>
            <Title order={1}>Help shape Excalimate</Title>
            <Text c="dimmed" size="lg">
              Suggest improvements, support the ideas that matter, and follow their progress from
              review to completion.
            </Text>
          </Stack>
          <Button
            size="md"
            leftSection={<IconMessagePlus size={19} />}
            onClick={submitControls.open}
            disabled={!data?.turnstileSiteKey}
          >
            Submit feedback
          </Button>
        </Group>

        <Paper className="feedback-filters" withBorder>
          <Stack>
            <Group grow align="flex-end">
              <TextInput
                label="Search feedback"
                placeholder="Search ideas and requests"
                leftSection={<IconSearch size={17} />}
                value={query.search}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    search: event.currentTarget.value,
                    page: 1,
                  }))
                }
              />
              <Select
                label="Category"
                value={query.category}
                allowDeselect={false}
                data={[
                  { value: 'all', label: 'All categories' },
                  ...FEEDBACK_CATEGORY_IDS.map((id) => ({
                    value: id,
                    label: FEEDBACK_CATEGORIES[id].label,
                  })),
                ]}
                onChange={(value) => updateQuery({ category: value ?? 'all' })}
              />
              <SegmentedControl
                value={query.sort}
                data={[
                  { value: 'top', label: 'Top' },
                  { value: 'newest', label: 'Newest' },
                ]}
                onChange={(sort) => updateQuery({ sort })}
              />
            </Group>
            <Tabs
              value={query.status}
              onChange={(status) => updateQuery({ status: status ?? 'all' })}
              variant="pills"
            >
              <Tabs.List>
                <Tabs.Tab className="feedback-status-tab" value="all">
                  All statuses
                </Tabs.Tab>
                {FEEDBACK_STATUS_IDS.map((id) => (
                  <Tabs.Tab className="feedback-status-tab" key={id} value={id}>
                    {FEEDBACK_STATUSES[id].label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Stack>
        </Paper>

        {error && (
          <Alert
            color="red"
            title="Feedback could not be loaded"
            icon={<IconAlertCircle size={18} />}
          >
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <Stack>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} height={180} radius="md" />
            ))}
          </Stack>
        ) : data?.items.length ? (
          <Stack>
            {data.items.map((item) => (
              <FeedbackCard
                key={item.number}
                item={item}
                voting={votingNumber === item.number}
                onVote={vote}
              />
            ))}
          </Stack>
        ) : !error ? (
          <Paper className="feedback-empty" withBorder>
            <Center>
              <Stack align="center">
                <IconSearch size={32} />
                <Title order={2}>No matching feedback</Title>
                <Text c="dimmed">Try a different search or filter.</Text>
              </Stack>
            </Center>
          </Paper>
        ) : null}

        {loading && data && (
          <Center>
            <Loader size="sm" />
          </Center>
        )}
        {data && data.totalPages > 1 && (
          <Center>
            <Pagination
              value={data.page}
              total={data.totalPages}
              onChange={(page) => updateQuery({ page })}
            />
          </Center>
        )}
      </Stack>
      <SubmitFeedbackModal
        opened={submitOpened}
        onClose={submitControls.close}
        onSubmitted={openSubmittedFeedback}
        siteKey={data?.turnstileSiteKey ?? ''}
      />
      <TurnstileAction
        ref={voteChallengeRef}
        siteKey={data?.turnstileSiteKey ?? ''}
        action="vote_feedback"
      />
    </Container>
  );
}

export default function FeedbackBoard() {
  return (
    <FeedbackProvider>
      <FeedbackBoardContent />
    </FeedbackProvider>
  );
}
