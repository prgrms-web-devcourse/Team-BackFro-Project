import Head from 'next/head';
import styled from '@emotion/styled';
import { Banner } from 'components/molecules';
import { useInfiniteScroll } from 'hooks';
import { useEffect, useState } from 'react';
import { ReviewFeed } from 'components/organisms';
import { reviewAPI } from 'apis';
import { useRecoilValue } from 'recoil';
import { userAtom } from 'states';
import { useRouter } from 'next/router';
import { ReviewMultiReadResponse, ReviewSingleReadData } from 'types/apis/review';
import { authorizeFetch } from 'utils';
import { GetServerSidePropsContext } from 'next';
import { mutate } from 'swr';

const CommunityPage = ({ data }: ReviewMultiReadResponse) => {
  const router = useRouter();
  const exhibitionId = router.query.exhibitionId || '';
  const { totalPage, content, pageNumber } = data;
  const [currentPage, setCurrentPage] = useState(pageNumber);

  const getMoreFeed = async () => {
    if (totalPage <= currentPage) {
      return;
    }

    const { data } = await reviewAPI.getReviewMulti({
      page: currentPage + 1,
      exhibitionId: Number(exhibitionId),
    });
    const newFeeds: ReviewSingleReadData[] = Object.values(data.data.content);

    setFeeds((feeds) => [...feeds, ...newFeeds]);
    setCurrentPage(currentPage + 1);
  };

  const [fetching, setFetching] = useInfiniteScroll(getMoreFeed);
  const [feeds, setFeeds] = useState<ReviewSingleReadData[]>([...content]);

  const { userId } = useRecoilValue(userAtom);

  const handleDeleteButtonClick = async () => {
    const { exhibitionId } = router.query;
    const { data } = await reviewAPI.getReviewMulti({ exhibitionId: Number(exhibitionId) });
    setFeeds([...data.data.content]);
  };

  useEffect(() => {
    return () => {
      mutate(undefined, { revalidate: true });
    };
  }, []);

  return (
    <>
      <Head>
        <title>ArtZip | 커뮤니티</title>
      </Head>

      <>
        <Banner
          subtitle="Art.zip 커뮤니티"
          title="아트집에서 다양한 후기를 만나보고"
          content={'여러 사람들과 소통하세요 !'}
        />
        <CommunityFeedWrapper>
          {feeds.map((feed) => {
            const { reviewId, user } = feed;
            return (
              <ReviewFeed
                key={reviewId}
                feed={feed}
                isMyFeed={userId === user.userId}
                onDeleteButtonClick={handleDeleteButtonClick}
              />
            );
          })}
        </CommunityFeedWrapper>
      </>
    </>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  let exhibitionId;

  if (!context.query) {
    exhibitionId = '';
  } else {
    exhibitionId = context.query.exhibitionId;
  }

  const accessToken = context.req.cookies['ACCESS_TOKEN'];
  const refreshToken = context.req.cookies['REFRESH_TOKEN'];
  const reviewMultiURL = `${process.env.NEXT_PUBLIC_API_END_POINT}api/v1/reviews/${
    exhibitionId ? `?exhibitionId=${exhibitionId}` : ''
  }`;

  if (accessToken && refreshToken) {
    const { data: reviewMultiRes } = await authorizeFetch({
      accessToken,
      refreshToken,
      apiURL: reviewMultiURL,
    });

    return {
      props: {
        data: reviewMultiRes,
      },
    };
  }

  const { data: reviewMultiRes } = await reviewAPI.getReviewMulti({
    exhibitionId: Number(exhibitionId),
  });

  return {
    props: {
      data: reviewMultiRes.data,
    },
  };
};

const CommunityFeedWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export default CommunityPage;
