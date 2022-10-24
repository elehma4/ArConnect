import { concatGatewayURL, defaultGateway } from "~applications/gateway";
import { DisplayTheme, Section, Text } from "@arconnect/components";
import { Avatar, NoAvatarIcon } from "./WalletHeader";
import { useEffect, useMemo, useState } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import { ArrowLeftIcon } from "@iconicicons/react";
import type { AnsUser } from "~lib/ans";
import { useTheme } from "~utils/theme";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";

export default function Head({ title }: Props) {
  // scroll position
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const listener = () => setScrollY(window.scrollY);

    window.addEventListener("scroll", listener);

    return () => window.removeEventListener("scroll", listener);
  }, []);

  // ui theme
  const theme = useTheme();

  // load ans cache
  const [ans] = useStorage<AnsUser>({
    key: "ans_data",
    area: "local",
    isSecret: true
  });

  // user avatar
  const avatar = useMemo(() => {
    if (!!ans?.avatar) {
      return concatGatewayURL(defaultGateway) + "/" + ans.avatar;
    }

    return undefined;
  }, [ans]);

  return (
    <HeadWrapper displayTheme={theme} scrolled={scrollY > 85}>
      <BackWrapper>
        <BackButton onClick={() => history.back()} />
      </BackWrapper>
      <PageInfo
        key={scrollY > 85 ? 0 : 1}
        scrollDirection={scrollY > 85 ? "down" : "up"}
      >
        <PageTitle>{title}</PageTitle>
        <Avatar img={avatar}>{!avatar && <NoAvatarIcon />}</Avatar>
      </PageInfo>
    </HeadWrapper>
  );
}

const HeadWrapper = styled(Section)<{
  scrolled: boolean;
  displayTheme: DisplayTheme;
}>`
  position: sticky;
  display: flex;
  align-items: ${(props) => (props.scrolled ? "flex-start" : "center")};
  flex-direction: ${(props) => (props.scrolled ? "column" : "row")};
  gap: ${(props) => (props.scrolled ? "0.5rem" : "0.77rem")};
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding-top: 2rem;
  padding-bottom: 0.8rem;
  background-color: rgba(${(props) => props.theme.background}, 0.75);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid;
  border-bottom-color: ${(props) =>
    props.scrolled
      ? "rgba(" +
        (props.displayTheme === "light" ? "235, 235, 241" : "31, 30, 47") +
        ")"
      : "transparent"};
  transition: border-color 0.23s ease-in-out;
`;

const BackWrapper = styled.div`
  display: flex;
  overflow: hidden;
  width: max-content;
  height: max-content;
`;

const BackButton = styled(ArrowLeftIcon)`
  font-size: 1.6rem;
  width: 1em;
  height: 1em;
  color: rgb(${(props) => props.theme.primaryText});
  cursor: pointer;
  transform: translateX(0);
  opacity: 1;
  transition: all 0.23s ease-in-out;

  path {
    stroke-width: 1.75 !important;
  }

  &:hover {
    opacity: 0.7;
  }
`;

const PageInfo = styled(motion.div).attrs<{
  scrollDirection: "up" | "down";
}>((props) => ({
  initial: { opacity: 0, y: props.scrollDirection === "up" ? 20 : -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: props.scrollDirection === "up" ? -20 : 20 }
}))<{
  scrollDirection: "up" | "down";
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const PageTitle = styled(Text).attrs({
  subtitle: true,
  noMargin: true
})`
  font-size: 1.5rem;
  font-weight: 500;
`;

interface Props {
  title: string;
}
